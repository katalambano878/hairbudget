<?php
use Illuminate\Support\Facades\DB;

$app = DB::table('applications')->where('uuid', 'rzh9hdesnyka024gg6wwn596')->first();
echo "lux_name={$app->name}\n";
echo "lux_fqdn={$app->fqdn}\n";
echo "lux_git={$app->git_repository}\n";
echo "lux_branch={$app->git_branch}\n";
echo "lux_env_id={$app->environment_id}\n";
echo "lux_dest={$app->destination_id}\n";
echo "lux_source={$app->source_id}\n";
echo "lux_key={$app->private_key_id}\n";
echo "lux_status={$app->status}\n";

$tables = DB::select("SELECT table_name FROM information_schema.columns WHERE column_name IN ('application_id','resourceable_id') AND table_schema='public'");
$names = [];
foreach ($tables as $t) {
    $names[$t->table_name] = true;
}
echo "related_tables=" . implode(',', array_keys($names)) . "\n";

$luxId = $app->id;
foreach (array_keys($names) as $table) {
    try {
        $c = DB::table($table)->where('application_id', $luxId)->count();
        if ($c) echo "count {$table}.application_id={$c}\n";
    } catch (Throwable $e) {
    }
    try {
        $c = DB::table($table)
            ->where('resourceable_id', $luxId)
            ->where('resourceable_type', 'App\\Models\\Application')
            ->count();
        if ($c) echo "count {$table}.resourceable={$c}\n";
    } catch (Throwable $e) {
    }
}

$keys = DB::table('environment_variables')
    ->where('resourceable_id', $luxId)
    ->where('resourceable_type', 'App\\Models\\Application')
    ->where('is_preview', false)
    ->pluck('key');
echo "lux_env_keys=" . implode(',', $keys->toArray()) . "\n";
