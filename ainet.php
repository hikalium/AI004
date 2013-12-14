<?php
//Args:
//	cmd
//	url

//Retv[0]:operation exitcode
	//ErrorCode:

if(!isset($_GET['cmd'])){
	exit("[463571]");
}
$cmd = $_GET['cmd'];

if(strcmp($cmd, 'httpreq') == 0){
	if(!isset($_GET['url'])){
		exit("[571765]");
	}
	$url = $_GET['url'];
	$response = sendHTTPQuery($url);
	echo($response);
} else{
	exit("[571465]");
}

// from http://www.spencernetwork.org/memo/tips-3.php
/*
	$url     : http://から始まるURL( http://user:pass@host:port/path?query )
	$method  : GET, POST, HEADのいずれか(デフォルトはGET)
	$headers : 任意の追加ヘッダ
	$post    : POSTの時に送信するデータを格納した配列("変数名"=>"値")
	*/
function sendHTTPQuery($url, $method="GET", $headers="", $post=array(""))
{
	/* URLを分解 */
	$parsedURL = parse_url($url);
	
	//URLの存在を確認（fsockopenのエラー抑制のため）
	if ($parsedURL && $parsedURL['host']) {
		$ip = getHostByName($parsedURL['host']);
		$long = ip2long($ip);
		
		if ($long === false || $ip !== long2ip($long)) {
			//Cannot resolve domain name
			exit("[747332]");
		} else {
			//ValidURL
		}
	} else {
		//Invalid URL
		exit("[747914]");
	}
	
	if(!$parsedURL){
		return false;
	}
	
	/* クエリー */
	if (isset($parsedURL['query'])) {
		$parsedURL['query'] = "?".$parsedURL['query'];
	} else {
		$parsedURL['query'] = "";
	}
	
	/* デフォルトのポートは80 */
	if (!isset($parsedURL['port'])) $parsedURL['port'] = 80;
	
	/* リクエストライン */
	$request  = $method." ".$parsedURL['path'].$parsedURL['query']." HTTP/1.0\r\n";
	
	/* リクエストヘッダ */
	$request .= "Host: ".$parsedURL['host']."\r\n";
	$request .= "User-Agent: PHP/".phpversion()."\r\n";
	
	/* Basic認証用のヘッダ */
	if (isset($parsedURL['user']) && isset($parsedURL['pass'])) {
		$request .= "Authorization: Basic ".base64_encode($parsedURL['user'].":".$parsedURL['pass'])."\r\n";
	}
	
	/* 追加ヘッダ */
	$request .= $headers;
	
	/* POSTの時はヘッダを追加して末尾にURLエンコードしたデータを添付 */
	if (strtoupper($method) == "POST") {
		while (list($name, $value) = each($post)) {
			$POST[] = $name."=".urlencode($value);
		}
		$postdata = implode("&", $POST);
		$request .= "Content-Type: application/x-www-form-urlencoded\r\n";
		$request .= "Content-Length: ".strlen($postdata)."\r\n";
		$request .= "\r\n";
		$request .= $postdata;
	} else {
		$request .= "\r\n";
	}
	
	/* WEBサーバへ接続 */
	$fp = fsockopen($parsedURL['host'], $parsedURL['port']);
	
	/* 接続に失敗した時の処理 */
	if (!$fp) {
		die("ERROR\n");
	}
	
	/* 要求データ送信 */
	fputs($fp, $request);
	
	/* 応答データ受信 */
	$response = "";
	while (!feof($fp)) {
		$response .= fgets($fp, 65535);
	}
	
	/* 接続を終了 */
	fclose($fp);
	
	/* ヘッダ部分とボディ部分を分離 */
	$DATA = split("\r\n\r\n", $response, 2);
	
	/* リクエストヘッダをコメントアウトして出力 */
	//echo "<!--\n".$request."\n-->\n";
	
	/* レスポンスヘッダをコメントアウトして出力 */
	//echo "<!--\n".$DATA[0]."\n-->\n";
	//echo($DATA[0]);
	
	/* メッセージボディを出力 */
	echo $DATA[1];
}

?>