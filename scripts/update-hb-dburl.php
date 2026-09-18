<?php
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

$pass = trim(file_get_contents('/tmp/hb-newpass.txt'));
if ($pass === '') {
    fwrite(STDERR, "no password provided\n");
    exit(1);
}

$app = DB::table('applications')->where('name', 'hairbudget-staging')->first();
if (!$app) {
    fwrite(STDERR, "hairbudget-staging not found\n");
    exit(1);
}

$columns = Schema::getColumnListing('environment_variables');
echo "table columns: " . implode(',', $columns) . "\n";

$urls = [
    'DATABASE_URL' => 'postgres://store_hairbudget:' . $pass . '@fleet-pgbouncer:6432/store_hairbudget',
    'DIRECT_URL'   => 'postgres://store_hairbudget:' . $pass . '@fleet-postgres:5432/store_hairbudget',
];

// Mirror an existing row so we only ever write columns this Coolify version has.
$template = (array) DB::table('environment_variables')
    ->where('resourceable_id', $app->id)
    ->where('resourceable_type', 'App\\Models\\Application')
    ->first();

foreach ($urls as $key => $url) {
    $existing = DB::table('environment_variables')
        ->where('resourceable_id', $app->id)
        ->where('resourceable_type', 'App\\Models\\Application')
        ->where('key', $key)
        ->first();

    if ($existing) {
        DB::table('environment_variables')->where('id', $existing->id)->update([
            'value'      => encrypt($url),
            'updated_at' => now(),
        ]);
        echo "updated {$key}\n";
        continue;
    }

    $row = $template;
    unset($row['id']);
    $row['key'] = $key;
    $row['value'] = encrypt($url);
    $row['created_at'] = now();
    $row['updated_at'] = now();
    if (array_key_exists('uuid', $row)) {
        $row['uuid'] = (string) Str::uuid();
    }
    DB::table('environment_variables')->insert($row);
    echo "inserted {$key}\n";
}

echo "env keys now: " . DB::table('environment_variables')
    ->where('resourceable_id', $app->id)
    ->where('resourceable_type', 'App\\Models\\Application')
    ->orderBy('key')->pluck('key')->implode(',') . "\n";
