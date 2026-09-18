<?php
use Illuminate\Support\Facades\DB;

foreach (['nad4u-app', 'hairbudget-staging'] as $name) {
    $row = DB::table('applications')->where('name', $name)->first();
    echo "===== {$name} =====\n";
    if (!$row) {
        echo "missing\n";
        continue;
    }
    foreach ((array) $row as $k => $v) {
        if (stripos($k, 'start') !== false || stripos($k, 'cmd') !== false || stripos($k, 'command') !== false) {
            echo "{$k}=" . (is_string($v) || is_numeric($v) ? $v : json_encode($v)) . "\n";
        }
    }
}
