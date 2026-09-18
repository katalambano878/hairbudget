<?php
use Illuminate\Support\Facades\DB;

$row = DB::table('application_deployment_queues')
    ->where('application_id', '77')
    ->orderByDesc('id')
    ->first();
echo "status={$row->status}\n";
$cols = array_keys((array) $row);
echo "cols=" . implode(',', $cols) . "\n";
foreach (['logs', 'output', 'error', 'deployment_error', 'status_message', 'current_process_id'] as $c) {
    if (isset($row->$c) && $row->$c) {
        $v = is_string($row->$c) ? $row->$c : json_encode($row->$c);
        echo "===== $c =====\n";
        echo substr($v, -4000) . "\n";
    }
}
