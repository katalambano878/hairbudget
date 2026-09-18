<?php
use Illuminate\Support\Facades\DB;

$row = DB::table('application_deployment_queues')
    ->where('application_id', '77')
    ->orderByDesc('id')
    ->first();
echo "uuid={$row->deployment_uuid}\n";
echo "status={$row->status}\n";
echo "updated={$row->updated_at}\n";
if (!empty($row->commit)) echo "commit={$row->commit}\n";
$logs = $row->logs ?? '';
$items = is_string($logs) ? json_decode($logs, true) : [];
if (!is_array($items)) {
    echo "no logs\n";
    exit;
}
$tail = array_slice($items, -8);
echo "===== last log lines =====\n";
foreach ($tail as $i) {
    $out = isset($i['output']) ? $i['output'] : '';
    $out = preg_replace('/\s+/', ' ', substr($out, -450));
    echo ($i['type'] ?? '?') . ': ' . $out . "\n";
}
