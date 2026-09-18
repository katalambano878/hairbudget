<?php
use Illuminate\Support\Facades\DB;
$n = DB::table('applications')->where('uuid', 'z3ir7zgic9i6j8kefroa05ag')->first(['source_type', 'source_id', 'destination_type', 'destination_id', 'private_key_id', 'git_full_url']);
$l = DB::table('applications')->where('uuid', 'rzh9hdesnyka024gg6wwn596')->first(['source_type', 'source_id', 'destination_type', 'destination_id', 'private_key_id', 'git_full_url']);
echo "nad4u=" . json_encode($n) . "\n";
echo "lux=" . json_encode($l) . "\n";
