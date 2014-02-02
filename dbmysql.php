<?php
//responseError("");

//
// Settings
//

//データベースユーザー名
define("DATABASE_USER", "aiclient");
//データベースパスワード
define("DATABASE_PWD", "WhoAmI?");
//データベース名
define("DATABASE_NAME", "aimemory");

//
// Static values
//

define("QUERY_CREATE_TABLE_MEMORY_TAG_ROOT", "
create table MemoryTagRoot (
	uuid binary(16) primary key,
	typeid binary(16) not null,
	description text character set utf8 not null,
	created_timestamp bigint,
	modified_timestamp bigint,
	data text character set utf8 not null,
	index(uuid)
)
");

define("QUERY_ADD_MTAG", "insert into MemoryTagRoot (
	uuid, typeid, description, created_timestamp, modified_timestamp, data
) values (
	unhex(replace(?, '-', '')), unhex(replace(?, '-', '')), ?, ?, ?, ?
)");
define("QUERY_ADD_MTAG_TYPES", "sssiis");

define("QUERY_SELECT_ALL_MTAG", "select hex(uuid), hex(typeid), description, created_timestamp, modified_timestamp, data from MemoryTagRoot");


//FOR DEBUG
mysqli_report(MYSQLI_REPORT_ERROR);

$db = connectDB();

//action解釈
if(isset($_GET['action'])){
	$action = $_GET['action'];
	if(strcmp($action, 'rebuild') == 0){
		rebuildDB($db);
		responseError("CEA95615-649C-4837-9E24-0C968FA57647", "OK");
	} else if(strcmp($action, 'viewall') == 0){
		$stmt = $db->prepare(QUERY_SELECT_ALL_MTAG);
		$stmt->execute();
		//
		$stmt->store_result();
		if($stmt->errno != 0){
			responseError("A0518702-C90C-4785-B5EA-1A213DD0205B");
		}
		
		$stmt->bind_result($uuid, $typeid, $desc, $cts, $mts, $data);
		while($stmt->fetch()){
			$uuid = strtolower($uuid);
			echo('["');
			echo(getFormedUUIDString($uuid));
			echo('","');
			echo(getFormedUUIDString($typeid));
			echo('","');
			echo($desc);
			echo('",');
			echo($cts);
			echo(',');
			echo($mts);
			echo(',"');
			echo($data);
			echo('"]');
			echo(PHP_EOL);
		}
		echo($stmt->num_rows);
		$stmt->close();
		exit(" OK");
	} else if(strcmp($action, 'viewallhtml') == 0){
		$stmt = $db->prepare(QUERY_SELECT_ALL_MTAG);
		$stmt->execute();
		//
		$stmt->store_result();
		if($stmt->errno != 0){
			responseError("A0518702-C90C-4785-B5EA-1A213DD0205B");
		}
		
		$stmt->bind_result($uuid, $typeid, $desc, $cts, $mts, $data);
		while($stmt->fetch()){
			$uuid = strtolower($uuid);
			echo('["');
			echo(getFormedUUIDString($uuid));
			echo('","');
			echo(getFormedUUIDString($typeid));
			echo('","');
			echo($desc);
			echo('",');
			echo($cts);
			echo(',');
			echo($mts);
			//echo(',"');
			//echo($data);
			//echo('"]');
			echo("<br />");
		}
		echo($stmt->num_rows);
		$stmt->close();
		exit(" OK");
	} else if(strcmp($action, 'add') == 0){
		if(isset($_GET['uuid'])){
			$uuid = $_GET['uuid'];
		} else{
			responseError("A0518702-C90C-4785-B5EA-1A213DD0205B", "uuid needed.");
		}
		if(isset($_GET['typeid'])){
			$typeid = $_GET['typeid'];
		} else{
			responseError("A0518702-C90C-4785-B5EA-1A213DD0205B", "typeid needed.");
		}
		if(isset($_GET['desc'])){
			$desc = $_GET['desc'];
		} else{
			responseError("A0518702-C90C-4785-B5EA-1A213DD0205B", "desc needed.");
		}
		if(isset($_GET['data'])){
			$data = $_GET['data'];
		} else{
			responseError("A0518702-C90C-4785-B5EA-1A213DD0205B", "data needed.");
		}
		$stmt = $db->prepare(QUERY_ADD_MTAG);
		//$uuid = "12363456-96EC-4E56-BC1F-B58DD0A76161";
		//$typeid = "12323456-96EC-4E36-BC1F-B58DD0A76161";
		$mts = getTimeStampMs();
		//$desc = "aiueo";
		//$data = "[0]";
		$stmt->bind_param(QUERY_ADD_MTAG_TYPES, $uuid, $typeid, $desc, $mts, $mts, $data);
		$stmt->execute();
		//
		$stmt->store_result();
		if($stmt->errno != 0){
			responseError("A0518702-C90C-4785-B5EA-1A213DD0205B", mysqli_error($db));
		}
		$stmt->close();
		exit("OK");
	}
}

//NOP error
responseError("B539657C-0FA6-49C2-AFB0-13AF5C7866ED");

function responseError($errid, $description = "")
{
	die('["' . $errid .'","' . $description . '"]');
}

function connectDB()
{
	$db = new mysqli('localhost', DATABASE_USER, DATABASE_PWD, DATABASE_NAME);
	
	if (mysqli_connect_error()) {
		// DB connect error
		responseError("3A8CF3C8-E6B6-4A99-9134-343CA341B591", mysqli_connect_error());
	}
	
	// 文字化け防止
	$db->set_charset("utf8");
	
	//データベース存在確認
	$stmt = $db->prepare("show tables");
	$stmt->execute();
	//
	$stmt->store_result();
	if($stmt->errno != 0){
		responseError("80FA2D65-9473-40B0-A3CE-159AE8E67017");
	}
	//テーブルの存在確認
	$stmt->bind_result($tablename);
	$found = false;
	while($stmt->fetch()){
		if($tablename == "MemoryTagRoot"){
			$found = true;
		}
	}
	if(!$found){
		rebuildDB($db);
	}
	$stmt->close();
	
	return $db;
}

function rebuildDB($db)
{
	//すでにあるテーブルの削除
	//MemoryTagRoot
	$stmt = $db->prepare("drop table if exists MemoryTagRoot");
	$stmt->execute();
	//エラーチェック省略
	$stmt->close();
	
	//再構築
	$stmt = $db->prepare(QUERY_CREATE_TABLE_MEMORY_TAG_ROOT);
	$stmt->execute();
	//エラーチェック省略
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