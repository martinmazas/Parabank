import type {
    Reporter,
    TestCase,
    TestResult,
    FullResult,
    FullConfig,
} from '@playwright/test/reporter';
import * as fs from 'fs';
import * as path from 'path';

// ── JSON output shapes ────────────────────────────────────────────────────────

/** The five fields tracked per test in the JSON report. */
interface TestRecord {
    /** Full breadcrumb: "Suite > … > Test title" */
    title: string;
    /** Derived final status across all attempts */
    status: 'passed' | 'failed' | 'flaky' | 'skipped' | 'timedOut';
    /** Total wall-clock time across every attempt, in milliseconds */
    durationMs: number;
    /** Number of retries actually performed (0 = passed or failed on first run) */
    retryCount: number;
    /** True when the test passed on ≥1 attempt and failed on ≥1 other */
    flaky: boolean;
}

interface Summary {
    total: number;
    passed: number;
    failed: number;
    flaky: number;
    skipped: number;
    timedOut: number;
}

interface Metadata {
    startTime: string;
    endTime: string;
    durationMs: number;
    runStatus: FullResult['status'];
    workers: number;
    projects: string[];
}

interface Report {
    metadata: Metadata;
    summary: Summary;
    tests: TestRecord[];
}

// ── Internal accumulator (never written to JSON) ──────────────────────────────

/**
 * Mutable state built up during onTestEnd calls.
 * Converted to a lean TestRecord in onEnd once all attempts are known.
 */
interface Accumulator {
    title: string;
    durationMs: number;
    /** result.retry from the latest onTestEnd call = total retries performed so far */
    retryCount: number;
    /** Status of the most recent attempt — needed to distinguish timedOut from failed */
    lastStatus: TestResult['status'];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function deriveStatus(
    outcome: ReturnType<TestCase['outcome']>,
    lastStatus: TestResult['status'],
): TestRecord['status'] {
    switch (outcome) {
        case 'flaky':      return 'flaky';
        case 'skipped':    return 'skipped';
        case 'expected':   return 'passed';
        case 'unexpected': return lastStatus === 'timedOut' ? 'timedOut' : 'failed';
    }
}

// ── Console output ────────────────────────────────────────────────────────────

const W = 56;
const HEAVY = '═'.repeat(W);
const LIGHT = '─'.repeat(W);

function row(label: string, value: string | number): string {
    const l = `  ${label}`;
    return l + String(value).padStart(W - l.length);
}

function printSummary(report: Report, outputFile: string): void {
    const { metadata: m, summary: s } = report;
    const durSec    = (m.durationMs / 1000).toFixed(1);
    const relOutput = path.relative(process.cwd(), outputFile);

    const failedTests = report.tests.filter(
        (t) => t.status === 'failed' || t.status === 'timedOut',
    );
    const flakyTests = report.tests.filter((t) => t.flaky);

    console.log('');
    console.log(HEAVY);
    console.log('             TEST EXECUTION SUMMARY');
    console.log(HEAVY);
    console.log(row('Status   :', m.runStatus.toUpperCase()));
    console.log(row('Start    :', m.startTime));
    console.log(row('Duration :', `${durSec}s`));
    console.log(row('Workers  :', m.workers));
    console.log(row('Projects :', m.projects.join(', ') || '—'));
    console.log(LIGHT);

    // Compact counts grid — icon  right-aligned count  label
    const n = (v: number) => String(v).padStart(3);
    console.log(`  ✓  ${n(s.passed)} passed     ✗  ${n(s.failed)} failed     ⚡ ${n(s.flaky)} flaky`);
    console.log(`  ○  ${n(s.skipped)} skipped    ⏱  ${n(s.timedOut)} timed out`);
    console.log('  ' + '─'.repeat(20));
    console.log(`  ·  ${n(s.total)} total`);

    if (failedTests.length > 0) {
        console.log(LIGHT);
        console.log('  Failed / Timed-out:');
        for (const t of failedTests) {
            const icon = t.status === 'timedOut' ? '⏱' : '✗';
            console.log(`    ${icon} ${t.title}`);
        }
    }

    if (flakyTests.length > 0) {
        console.log(LIGHT);
        console.log('  Flaky:');
        for (const t of flakyTests) {
            console.log(
                `    ⚡ ${t.title}` +
                `  (passed after ${t.retryCount} retr${t.retryCount === 1 ? 'y' : 'ies'})`,
            );
        }
    }

    console.log(LIGHT);
    console.log(row('  Report   :', relOutput));
    console.log(HEAVY);
    console.log('');
}

// ── Reporter ──────────────────────────────────────────────────────────────────

export default class CustomReporter implements Reporter {
    private readonly outputFile: string;
    private startTime = new Date();
    private config!: FullConfig;

    /** Mutable per-test state, keyed by TestCase.id */
    private readonly accumulators = new Map<string, Accumulator>();
    /** Stored so we can call test.outcome() in onEnd */
    private readonly testCases = new Map<string, TestCase>();

    constructor(options: { outputFile?: string } = {}) {
        this.outputFile =
            options.outputFile ??
            path.resolve(process.cwd(), 'test-results', 'report.json');
    }

    // ── Playwright hooks ───────────────────────────────────────────────────────

    onBegin(config: FullConfig): void {
        this.config = config;
        this.startTime = new Date();
    }

    /**
     * Called once per attempt. result.retry is 0 on the initial run, 1 on the
     * first retry, etc. — so the final call's retry value equals total retries
     * performed.
     */
    onTestEnd(test: TestCase, result: TestResult): void {
        this.testCases.set(test.id, test);

        if (!this.accumulators.has(test.id)) {
            this.accumulators.set(test.id, {
                title: test.titlePath().filter(Boolean).join(' > '),
                durationMs: 0,
                retryCount: 0,
                lastStatus: result.status,
            });
        }

        const acc = this.accumulators.get(test.id)!;
        acc.durationMs  += result.duration;
        acc.retryCount   = result.retry;     // overwrites each attempt; final value = retries done
        acc.lastStatus   = result.status;
    }

    onEnd(fullResult: FullResult): void {
        const endTime = new Date();

        const summary: Summary = {
            total: 0, passed: 0, failed: 0, flaky: 0, skipped: 0, timedOut: 0,
        };

        const tests: TestRecord[] = [];

        for (const [id, acc] of this.accumulators) {
            const outcome = this.testCases.get(id)!.outcome();
            const flaky  = outcome === 'flaky';
            const status = deriveStatus(outcome, acc.lastStatus);

            tests.push({
                title:      acc.title,
                status,
                durationMs: acc.durationMs,
                retryCount: acc.retryCount,
                flaky,
            });

            summary.total++;
            summary[status]++;
        }

        const projects = [
            ...new Set(this.config.projects.map((p) => p.name).filter(Boolean)),
        ];

        const report: Report = {
            metadata: {
                startTime:  this.startTime.toISOString(),
                endTime:    endTime.toISOString(),
                durationMs: endTime.getTime() - this.startTime.getTime(),
                runStatus:  fullResult.status,
                workers:    this.config.workers,
                projects,
            },
            summary,
            tests,
        };

        fs.mkdirSync(path.dirname(this.outputFile), { recursive: true });
        fs.writeFileSync(this.outputFile, JSON.stringify(report, null, 2), 'utf-8');

        printSummary(report, this.outputFile);
    }

    /** Tell Playwright this reporter writes to stdout so it won't suppress output. */
    printsToStdio(): boolean {
        return true;
    }
}
