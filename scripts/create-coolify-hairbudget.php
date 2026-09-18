<?php
/**
 * Create Coolify project + staging app for HairBudget, NAD4U-shaped (nixpacks, port 3000).
 * Env values are encrypt()'d. Secrets are read from VPS files, never echoed.
 */
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

$template = DB::table('applications')->where('uuid', 'z3ir7zgic9i6j8kefroa05ag')->first();
if (!$template) {
    fwrite(STDERR, "template nad4u-app missing\n");
    exit(1);
}

$existing = DB::table('applications')->where('name', 'hairbudget-staging')->first();
if ($existing) {
    echo "exists uuid={$existing->uuid} id={$existing->id} fqdn={$existing->fqdn}\n";
    exit(0);
}

$projectTemplate = DB::table('projects')->where('id', 6)->first();
$teamId = $projectTemplate->team_id ?? 0;
$existingProject = DB::table('projects')->where('name', 'HairBudget')->first();

$passFile = '/data/fleet/secrets/store_hairbudget.env';
if (!is_readable($passFile)) {
    // Coolify container may not see the host path — caller must pass STORE_PASS via env file copied in.
    $passFile = '/tmp/store_hairbudget.env';
}
if (!is_readable($passFile)) {
    fwrite(STDERR, "missing store_hairbudget.env\n");
    exit(1);
}
$storePass = null;
foreach (file($passFile, FILE_IGNORE_NEW_LINES) as $line) {
    if (str_starts_with($line, 'STORE_PASS=')) {
        $storePass = substr($line, strlen('STORE_PASS='));
        break;
    }
}
if (!$storePass) {
    fwrite(STDERR, "STORE_PASS missing\n");
    exit(1);
}

$jwtFile = '/tmp/hairbudget-auth-jwt.secret';
if (!is_readable($jwtFile)) {
    fwrite(STDERR, "missing AUTH_JWT_SECRET file\n");
    exit(1);
}
$jwt = trim(file_get_contents($jwtFile));

$databaseUrl = 'postgres://store_hairbudget:' . $storePass . '@fleet-pgbouncer:6432/store_hairbudget';
$appUrl = 'https://hairbudget-staging.169-58-8-203.sslip.io';

$now = now();
if ($existingProject) {
    $projectId = $existingProject->id;
} else {
    $projectId = DB::table('projects')->insertGetId([
        'uuid' => (string) Str::uuid(),
        'name' => 'HairBudget',
        'description' => 'HairBudget store — plain Postgres',
        'team_id' => $teamId,
        'created_at' => $now,
        'updated_at' => $now,
    ]);
}

$existingEnv = DB::table('environments')->where('project_id', $projectId)->where('name', 'production')->first();
if ($existingEnv) {
    $environmentId = $existingEnv->id;
} else {
    $environmentId = DB::table('environments')->insertGetId([
        'name' => 'production',
        'project_id' => $projectId,
        'uuid' => Str::random(32),
        'created_at' => $now,
        'updated_at' => $now,
    ]);
}

$appUuid = Str::lower(Str::random(24));
$appData = (array) $template;
unset($appData['id']);
$appData['uuid'] = $appUuid;
$appData['name'] = 'hairbudget-staging';
$appData['fqdn'] = $appUrl;
$appData['git_repository'] = 'katalambano878/hairbudget.git';
$appData['git_branch'] = 'main';
$appData['git_commit_sha'] = 'HEAD';
$appData['git_full_url'] = null;
$appData['custom_labels'] = null;
$appData['status'] = 'exited:unhealthy';
$appData['environment_id'] = $environmentId;
$appData['source_id'] = 0;
$appData['source_type'] = 'App\\Models\\GithubApp';
$appData['private_key_id'] = null;
$appData['description'] = 'HairBudget staging (plain Postgres)';
$appData['created_at'] = $now;
$appData['updated_at'] = $now;
if (empty($appData['last_online_at'])) {
    $appData['last_online_at'] = $now;
}
$appData['config_hash'] = $template->config_hash;

$appId = DB::table('applications')->insertGetId($appData);

$settings = (array) DB::table('application_settings')->where('application_id', $template->id)->first();
unset($settings['id']);
$settings['application_id'] = $appId;
$settings['created_at'] = $now;
$settings['updated_at'] = $now;
DB::table('application_settings')->insert($settings);

$pairs = [
    'NIXPACKS_NODE_VERSION' => '20',
    'NODE_ENV' => 'production',
    'DATABASE_URL' => $databaseUrl,
    'DATABASE_SSL' => 'false',
    'AUTH_JWT_SECRET' => $jwt,
    'NEXT_PUBLIC_USE_PLAIN_PG' => 'true',
    'NEXT_PUBLIC_APP_URL' => $appUrl,
    'NEXT_PUBLIC_SITE_NAME' => 'HairBudget',
    'ADMIN_EMAIL' => 'info@hairbudgetgh.com',
    'EMAIL_FROM' => 'HairBudget <noreply@hairbudgetgh.com>',
];

foreach ($pairs as $key => $value) {
    $buildtime = str_starts_with($key, 'NEXT_PUBLIC_') || $key === 'NIXPACKS_NODE_VERSION' || $key === 'NODE_ENV';
    DB::table('environment_variables')->insert([
        'uuid' => (string) Str::uuid(),
        'key' => $key,
        'value' => encrypt($value),
        'is_multiline' => false,
        'is_literal' => false,
        'is_buildtime' => $buildtime,
        'is_runtime' => true,
        'is_preview' => false,
        'resourceable_type' => 'App\\Models\\Application',
        'resourceable_id' => $appId,
        'created_at' => $now,
        'updated_at' => $now,
    ]);
}

echo "created name=hairbudget-staging uuid={$appUuid} id={$appId} project={$projectId} env={$environmentId} fqdn={$appUrl}\n";
