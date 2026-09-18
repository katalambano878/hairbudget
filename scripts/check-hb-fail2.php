<?php
use Illuminate\Support\Facades\DB;

$row = DB::table('application_deployment_queues')
    ->where('application_id', '77')
    ->orderByDesc('id')
    ->first();
$logs = json_decode($row->logs, true);
if (!is_array($logs)) {
    echo "logs not json\n";
    echo substr((string) $row->logs, 0, 2000);
    exit(0);
}
foreach ($logs as $entry) {
    $out = $entry['output'] ?? '';
    if (!is_string($out)) continue;
    if (
        stripos($out, 'error') !== false
        || stripos($out, 'Type error') !== false
        || stripos($out, 'Failed') !== false
        || stripos($out, 'npm ERR') !== false
        || stripos($out, 'Cannot find') !== false
    ) {
        echo "----\n" . $out . "\n";
    }
}
