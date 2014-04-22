<?php

//
// Settings
//

// grant 権限内容(all privileges) on 権限対象(dbname.tablename) to ユーザー@ホスト名 [ identified by "パスワード"]; 

//データベースユーザー名
define("DATABASE_USER", "aiclient");
//データベースパスワード
define("DATABASE_PWD", "WhoAmI?");
//データベース名
define("DATABASE_NAME", "MemoryDB");

//
// Static values
//

define("QUERY_CREATE_TABLE_Node", "
create table Node (
	nodeid binary(16) primary key,
	typeid binary(16) not null,
	identifier text character set utf8 not null
)
");

define("QUERY_CREATE_TABLE_Edge", "
create table Edge (
	edgeid binary(16) primary key,
	typeid binary(16) not null,
	nodeid0 binary(16) not null,
	nodeid1 binary(16) not null
)
");

define("QUERY_ADD_Node", "
insert into Node (
	nodeid, typeid, identifier
) values (
	unhex(replace(?, '-', '')), unhex(replace(?, '-', '')), ?
)
");
define("QUERY_ADD_Node_TYPES", "sss");

define("QUERY_ADD_Edge", "
insert into Node (
	edgeid, typeid, nodeid0, nodeid1
) values (
	unhex(replace(?, '-', '')), unhex(replace(?, '-', '')), unhex(replace(?, '-', '')), unhex(replace(?, '-', ''))
)
");
define("QUERY_ADD_Edge_TYPES", "ssss");

define("QUERY_SELECT_ALL_Node", "select hex(nodeid), hex(typeid), identifier from Node");
define("QUERY_SELECT_ALL_Edge", "select hex(edgeid), hex(typeid),  hex(nodeid0), hex(nodeid1) from Edge");

//FOR DEBUG
mysqli_report(MYSQLI_REPORT_ERROR);

$db = connectDB();

//action解釈
if(isset($_GET['action'])){
	$action = $_GET['action'];
	if(strcmp($action, 'rebuild') == 0){
		rebuildDB($db);
		exitWithResponseCode("CEA95615-649C-4837-9E24-0C968FA57647", "OK");
	} else if(strcmp($action, 'getallnode') == 0){
		$stmt = $db->prepare(QUERY_SELECT_ALL_Node);
		$stmt->execute();
		//
		$stmt->store_result();
		if($stmt->errno != 0){
			exitWithResponseCode("A0518702-C90C-4785-B5EA-1A213DD0205B");
		}
		
		$stmt->bind_result($uuid, $typeid, $ident);
		while($stmt->fetch()){
			$uuid = strtolower($uuid);
			echo('["');
			echo(getFormedUUIDString($uuid));
			echo('","');
			echo(getFormedUUIDString($typeid));
			echo('","');
			echo($ident);
			echo('"]');
			echo(PHP_EOL);
		}
		$stmt->close();
		exit();
	} else if(strcmp($action, 'viewallnode') == 0){
		$stmt = $db->prepare(QUERY_SELECT_ALL_Node);
		$stmt->execute();
		//
		$stmt->store_result();
		if($stmt->errno != 0){
			exitWithResponseCode("A0518702-C90C-4785-B5EA-1A213DD0205B");
		}
		
		$stmt->bind_result($uuid, $typeid, $ident);
		while($stmt->fetch()){
			$uuid = strtolower($uuid);
			echo('["');
			echo(getFormedUUIDString($uuid));
			echo('","');
			echo(getFormedUUIDString($typeid));
			echo('","');
			echo($ident);
			echo('"]');
			echo("<br />");
		}
		echo($stmt->num_rows);
		$stmt->close();
		exit(" OK");
	} else if(strcmp($action, 'addnode') == 0){
		if(isset($_GET['nodeid'])){
			$uuid = $_GET['nodeid'];
		} else{
			exitWithResponseCode("A0518702-C90C-4785-B5EA-1A213DD0205B", "nodeid needed.");
		}
		if(isset($_GET['typeid'])){
			$typeid = $_GET['typeid'];
		} else{
			exitWithResponseCode("A0518702-C90C-4785-B5EA-1A213DD0205B", "typeid needed.");
		}
		if(isset($_GET['ident'])){
			$ident = $_GET['ident'];
		} else{
			exitWithResponseCode("A0518702-C90C-4785-B5EA-1A213DD0205B", "ident needed.");
		}

		$stmt = $db->prepare(QUERY_ADD_Node);
		$mts = getTimeStampMs();
		$stmt->bind_param(QUERY_ADD_Node_TYPES, $nodeid, $typeid, $ident);
		$stmt->execute();
		//
		$stmt->store_result();
		if($stmt->errno != 0){
			exitWithResponseCode("A0518702-C90C-4785-B5EA-1A213DD0205B", mysqli_error($db));
		}
		$stmt->close();
		exitWithResponseCode("CEA95615-649C-4837-9E24-0C968FA57647", "OK");
	} else if(strcmp($action, 'saytest') == 0){
		/*
		//for Mac OSX say command.
		system("say " . escapeshellarg("sayのテストをしています。"));
		*/
	}
}

//NOP error
exitWithResponseCode("B539657C-0FA6-49C2-AFB0-13AF5C7866ED");

function exitWithResponseCode($errid, $description = "")
{
	die('["' . $errid .'","' . $description . '"]');
}

function connectDB()
{
	$db = new mysqli('localhost', DATABASE_USER, DATABASE_PWD, DATABASE_NAME);
	
	if (mysqli_connect_error()) {
		// DB connect error
		exitWithResponseCode("3A8CF3C8-E6B6-4A99-9134-343CA341B591", mysqli_connect_error());
	}
	
	// 文字化け防止
	$db->set_charset("utf8");
	
	//データベース存在確認
	$stmt = $db->prepare("show tables");
	$stmt->execute();
	//
	$stmt->store_result();
	if($stmt->errno != 0){
		exitWithResponseCode("80FA2D65-9473-40B0-A3CE-159AE8E67017");
	}
	//テーブルの存在確認
	$stmt->bind_result($tablename);
	$found = 0;
	while($stmt->fetch()){
		if($tablename == "Node"){
			$found |= 1;
		}
		if($tablename == "Edge"){
			$found |= 2;
		}
	}
	if(($found & 3) != 3){
		rebuildDB($db);
	}
	$stmt->close();
	
	return $db;
}

function rebuildDB($db)
{
	// すでにあるテーブルの削除
	
	// Node
	$stmt = $db->prepare("drop table if exists Node");
	$stmt->execute();
	// エラーチェック省略
	$stmt->close();
	
	// Edge
	$stmt = $db->prepare("drop table if exists Edge");
	$stmt->execute();
	// エラーチェック省略
	$stmt->close();
	
	// 再構築
	
	// Node
	$stmt = $db->prepare(QUERY_CREATE_TABLE_Node);
	$stmt->execute();
	// エラーチェック省略
	$stmt->close();
	
	// Edge
	$stmt = $db->prepare(QUERY_CREATE_TABLE_Edge);
	$stmt->execute();
	// エラーチェック省略
	$stmt->close();
}

function getFormedUUIDString($str)
{
	$str = strtolower($str);
	return (
		substr($str, 0, 8) . "-" . 
		substr($str, 8, 4) . "-" . 
		substr($str, 12, 4) . "-" . 
		substr($str, 16, 4) . "-" . 
		substr($str, 20, 12)
	);
}

function getTimeStampMs()
{
	return ceil(microtime(true)*1000);
}
?>