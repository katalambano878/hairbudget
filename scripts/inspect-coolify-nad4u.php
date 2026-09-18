<?php
use Illuminate\Support\Facades\DB;

$row = DB::table('applications')->where('uuid', 'z3ir7zgic9i6j8kefroa05ag')->first();
if (!$row) {
    fwrite(STDERR, "nad4u-app not found\n");
    exit(1);
}
$out = (array) $row;
foreach (['private_key_id', 'destination_id', 'source_id', 'environment_id', 'server_id'] as $k) {
    // keep ids
}
$hide = ['value'];
echo "keys=" . implode(',', array_keys($out)) . "\n";
echo "name={$row->name}\n";
echo "uuid={$row->uuid}\n";
echo "fqdn={$row->fqdn}\n";
echo "git_repository={$row->git_repository}\n";
echo "git_branch={$row->git_branch}\n";
echo "build_pack={$row->build_pack}\n";
echo "ports_exposes={$row->ports_exposes}\n";
echo "environment_id={$row->environment_id}\n";
echo "destination_id=" . ($row->destination_id ?? '') . "\n";
echo "source_id=" . ($row->source_id ?? '') . "\n";
echo "private_key_id=" . ($row->private_key_id ?? '') . "\n";
echo "server_id=" . ($row->server_id ?? '') . "\n";
echo "project_id=" . ($row->project_id ?? '') . "\n";

$envCount = DB::table('environment_variables')
    ->where('resourceable_id', $row->id)
    ->where('resourceable_type', 'App\\Models\\Application')
    ->where('is_preview', false)
    ->count();
echo "env_count={$envCount}\n";

$keys = DB::table('environment_variables')
    ->where('resourceable_id', $row->id)
    ->where('resourceable_type', 'App\\Models\\Application')
    ->where('is_preview', false)
    ->pluck('key');
echo "env_keys=" . implode(',', $keys->toArray()) . "\n";
