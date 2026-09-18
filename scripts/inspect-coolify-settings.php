<?php
use Illuminate\Support\Facades\DB;

$id = DB::table('applications')->where('uuid', 'z3ir7zgic9i6j8kefroa05ag')->value('id');
$row = DB::table('application_settings')->where('application_id', $id)->first();
echo json_encode($row, JSON_PRETTY_PRINT) . "\n";

$env = DB::table('environments')->where('id', 6)->first();
echo "env6=" . json_encode($env) . "\n";
$env35 = DB::table('environments')->where('id', 35)->first();
echo "env35=" . json_encode($env35) . "\n";
