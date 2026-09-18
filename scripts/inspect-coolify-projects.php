<?php
use Illuminate\Support\Facades\DB;

$p6 = DB::table('projects')->where('id', 6)->first();
echo "project6=" . json_encode($p6) . "\n";
$p35 = DB::table('projects')->where('id', 35)->first();
echo "project35=" . json_encode($p35) . "\n";

$cols = DB::select("SELECT column_name FROM information_schema.columns WHERE table_name='projects' ORDER BY ordinal_position");
echo "project_cols=" . implode(',', array_map(fn ($c) => $c->column_name, $cols)) . "\n";

$envCols = DB::select("SELECT column_name FROM information_schema.columns WHERE table_name='environments' ORDER BY ordinal_position");
echo "env_cols=" . implode(',', array_map(fn ($c) => $c->column_name, $envCols)) . "\n";

$teams = DB::table('teams')->select('id', 'name')->get();
echo "teams=" . json_encode($teams) . "\n";
