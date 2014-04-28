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
	identifier text character set utf8,
	modtimestamp bigint
)
");

define("QUERY_CREATE_TABLE_Edge", "
create table Edge (
	edgeid binary(16) primary key,
	typeid binary(16) not null,
	nodeid0 binary(16) not null,
	nodeid1 binary(16) not null,
	modtimestamp bigint
)
");

//
define("QUERY_ADD_Node", "
insert into Node (
	nodeid, typeid, identifier, modtimestamp
) values (
	unhex(replace(?, '-', '')), unhex(replace(?, '-', '')), ?, ?
)
");
define("QUERY_ADD_Node_TYPES", "sssi");
//
define("QUERY_ADD_Edge", "
insert into Node (
	edgeid, typeid, nodeid0, nodeid1, modtimestamp
) values (
	unhex(replace(?, '-', '')), unhex(replace(?, '-', '')), unhex(replace(?, '-', '')), unhex(replace(?, '-', '')), ?
)
");
define("QUERY_ADD_Edge_TYPES", "ssssi");
//
define("QUERY_UPDATE_Node", "
UPDATE Node SET
	typeid=unhex(replace(?, '-', '')), identifier=?, modtimestamp=?
WHERE
	nodeid=unhex(replace(?, '-', ''))
");
define("QUERY_UPDATE_Node_TYPES", "ssis");
//

define("QUERY_SELECT_ALL_Node", "select hex(nodeid), hex(typeid), identifier from Node");
define("QUERY_SELECT_ALL_Node_With_modtimestamp", "select hex(nodeid), hex(typeid), identifier, modtimestamp from Node");
define("QUERY_SELECT_ALL_Edge", "select hex(edgeid), hex(typeid),  hex(nodeid0), hex(nodeid1) from Edge");

define("QUERY_SELECT_modified_Node", "select hex(nodeid), hex(typeid), identifier from Node WHERE modtimestamp>?");
define("QUERY_SELECT_modified_Node_TYPES", "i");

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
			echoNode(
				getFormedUUIDString($uuid),
				getFormedUUIDString($typeid),
				$ident
			);
			echo(PHP_EOL);
		}
		$stmt->close();
		// put timestamp tag
		echoMemoryDBNetworkTimestamp();
		exit();
	} else if(strcmp($action, 'getnodemod') == 0){
		if(isset($_GET['t'])){
			$ts = $_GET['t'];
		} else{
			$ts = 0;
		}
		$stmt = $db->prepare(QUERY_SELECT_modified_Node);
		$stmt->bind_param(QUERY_SELECT_modified_Node_TYPES, $ts);
		$stmt->execute();
		//
		$stmt->store_result();
		if($stmt->errno != 0){
			exitWithResponseCode("A0518702-C90C-4785-B5EA-1A213DD0205B");
		}
		
		$stmt->bind_result($uuid, $typeid, $ident);
		while($stmt->fetch()){
			echoNode(
				getFormedUUIDString($uuid),
				getFormedUUIDString($typeid),
				$ident
			);
			echo(PHP_EOL);
		}
		$stmt->close();
		// put timestamp tag
		echoMemoryDBNetworkTimestamp();
		exit();
	} else if(strcmp($action, 'viewallnode') == 0){
		$stmt = $db->prepare(QUERY_SELECT_ALL_Node_With_modtimestamp);
		$stmt->execute();
		//
		$stmt->store_result();
		if($stmt->errno != 0){
			exitWithResponseCode("A0518702-C90C-4785-B5EA-1A213DD0205B");
		}
		
		$stmt->bind_result($uuid, $typeid, $ident, $mts);
		while($stmt->fetch()){
			echoNode(
				getFormedUUIDString($uuid),
				getFormedUUIDString($typeid),
				$ident
			);
			echo(' @' . $mts);
			echo("<br />");
		}
		echo($stmt->num_rows);
		$stmt->close();
		exit(" OK " . getTimeStampMs());
	} else if(strcmp($action, 'addnode') == 0){
		if(isset($_GET['nid'])){
			$nodeid = $_GET['nid'];
		} else{
			exitWithResponseCode("A0518702-C90C-4785-B5EA-1A213DD0205B", "nodeid needed.");
		}
		if(isset($_GET['tid'])){
			$typeid = $_GET['tid'];
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
		$stmt->bind_param(QUERY_ADD_Node_TYPES, $nodeid, $typeid, $ident, $mts);
		$stmt->execute();
		//
		$stmt->store_result();
		if($stmt->errno != 0){
			exitWithResponseCode("A0518702-C90C-4785-B5EA-1A213DD0205B", mysqli_error($db));
		}
		$stmt->close();
		exitWithResponseCode("cea95615-649c-4837-9e24-0c968fa57647", "OK");
	} else if(strcmp($action, 'updatenode') == 0){
		if(isset($_GET['nid'])){
			$nodeid = $_GET['nid'];
		} else{
			exitWithResponseCode("A0518702-C90C-4785-B5EA-1A213DD0205B", "nodeid needed.");
		}
		if(isset($_GET['tid'])){
			$typeid = $_GET['tid'];
		} else{
			exitWithResponseCode("A0518702-C90C-4785-B5EA-1A213DD0205B", "typeid needed.");
		}
		if(isset($_GET['ident'])){
			$ident = $_GET['ident'];
		} else{
			exitWithResponseCode("A0518702-C90C-4785-B5EA-1A213DD0205B", "ident needed.");
		}

		$stmt = $db->prepare(QUERY_UPDATE_Node);
		$mts = getTimeStampMs();
		$stmt->bind_param(QUERY_UPDATE_Node_TYPES, $typeid, $ident, $mts, $nodeid);
		$stmt->execute();
		//
		$stmt->store_result();
		if($stmt->errno != 0){
			exitWithResponseCode("A0518702-C90C-4785-B5EA-1A213DD0205B", mysqli_error($db));
		}
		$stmt->close();
		exitWithResponseCode("cea95615-649c-4837-9e24-0c968fa57647", "OK");
	}
}

//NOP error
exitWithResponseCode("b539657c-0fa6-49c2-afb0-13af5c7866ed");

function exitWithResponseCode($errid, $description = "")
{
	echoNode("1eeb6d3d-751f-444f-91c8-ed940e65f8bd", $errid, $description);
	exit();
}

function echoMemoryDBNetworkTimestamp()
{
	echoNode(
		"a2560a9c-dcf7-4746-ac14-347188518cf2",
		"e3346fd4-ac17-41c3-b3c7-e04972e5c014",
		getTimeStampMs()
	);
}

function echoNode($nid, $tid, $ident)
{
	echo('["' . $nid .'","' . $tid .'","' . $ident . '"]');
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
	//
	// 削除
	//
	
	// Node
	$stmt = $db->query("drop table if exists Node");
	
	// Edge
	$stmt = $db->query("drop table if exists Edge");
	
	//
	// 再構築
	//
	
	// Node
	$stmt = $db->query(QUERY_CREATE_TABLE_Node);
	
	// Edge
	$stmt = $db->query(QUERY_CREATE_TABLE_Edge);
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