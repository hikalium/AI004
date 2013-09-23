//AI004

//
// クラス拡張
//

//継承機能
Function.prototype.extend = function(baseConstructor, newPrototype){
	// http://sourceforge.jp/projects/h58pcdgame/scm/git/GameScriptCoreLibrary/blobs/master/www/corelib/jsbase.js
	//最初にベースクラスのプロトタイプを引き継ぐ。
	var F = function(){};
	F.prototype = baseConstructor.prototype;
	this.prototype = new F();
	//新たなプロトタイプを追加・上書きする。
	if(newPrototype){
		for(var prop in newPrototype){
			this.prototype[prop] = newPrototype[prop];
		}
	}
	//コンストラクタを設定
	this.prototype.constructor = this;
	//ベースクラスのコンストラクタを設定
	this.base = baseConstructor;
	return this;
};

//配列関連
Array.prototype.removeAllObject = function(anObject){
	//Array中にある全てのanObjectを削除し、空いた部分は前につめる。
	//戻り値は削除が一回でも実行されたかどうか
	var ret = false;
	for(var i = 0; i < this.length; i++){
		if(this[i] == anObject){
			this.splice(i, 1);
			ret = true;
			i--;
		}
	}
	return ret;
}
Array.prototype.removeAnObject = function(anObject){
	//Array中にある最初のanObjectを削除し、空いた部分は前につめる。
	//戻り値は削除が実行されたかどうか
	for(var i = 0; i < this.length; i++){
		if(this[i] == anObject){
			this.splice(i, 1);
			return true;
		}
	}
	return false;
}
Array.prototype.removeByIndex = function(index){
	//Array[index]を削除し、空いた部分は前につめる。
	this.splice(index, 1);
	return;
}
Array.prototype.intersectionWith = function(a, b, fEqualTo){
	//積集合を求める
	//fEqualToは省略可能で、評価関数fEqualTo(a[i], b[j])を設定する。
	var r = new Array();
	for(var i = 0, len = b.length; i < len; i++){
		if(this.isIncluded(b[i], fEqualTo)){
			r.push(b[i]);
		}
	}
	return r;
}
Array.prototype.unionWith = function(a, b, fEqualTo){
	//和集合を求める
	//fEqualToは省略可能で、評価関数fEqualTo(a[i], b[j])を設定する。
	var r = new Array();
	for(var i = 0, len = b.length; i < len; i++){
		if(!this.isIncluded(b[i], fEqualTo)){
			r.push(b[i]);
		}
	}
	return this.concat(r);
}
Array.prototype.isIncluded = function(obj, fEqualTo){
	//含まれている場合は配列内のそのオブジェクトを返す
	//fEqualToは省略可能で、評価関数fEqualTo(array[i], obj)を設定する。
	if(fEqualTo == undefined){
		for(var i = 0, len = this.length; i < len; i++){
			if(this[i] == obj){
				return this[i];
			}
		}
	} else{
		for(var i = 0, len = this.length; i < len; i++){
			if(fEqualTo(this[i], obj)){
				return this[i];
			}
		}
	}
	return false;
}
Array.prototype.pushUnique = function(obj, fEqualTo){
	//値が既に存在する場合は追加しない。評価関数fEqualTo(array[i], obj)を設定することができる。
	//結果的に配列内にあるオブジェクトが返される。
	var o = this.isIncluded(obj, fEqualTo);
	if(!o){
		this.push(obj);
		return obj;
	}
	return o;
}
Array.prototype.stableSort = function(f){
	// http://blog.livedoor.jp/netomemo/archives/24688861.html
	// Chrome等ではソートが必ずしも安定ではないので、この関数を利用する。
	if(f == undefined){
		f = function(a,b){ return a - b; };
	}
	for(var i = 0; i < this.length; i++){
		this[i].__id__ = i;
	}
	this.sort.call(this, function(a,b){
		var ret = f(a, b);
		if(ret == 0){
			return (a.__id__ > b.__id__) ? 1 : -1;
		} else{
			return ret;
		}
	});
	for(var i = 0;i < this.length;i++){
		delete this[i].__id__;
	}
};

//文字列関連
String.prototype.replaceAll = function(org, dest){
	//String中にある文字列orgを文字列destにすべて置換する。
	//http://www.syboos.jp/webjs/doc/string-replace-and-replaceall.html
	return this.split(org).join(dest);
}
String.prototype.compareLeftHand = function (search){
	//前方一致長を求める。
	for(var i = 0; search.charAt(i) != ""; i++){
		if(search.charAt(i) != this.charAt(i)){
			break;
		}
	}
	return i;
}
String.prototype.splitByArray = function(separatorList){
	//リスト中の文字列それぞれで分割された配列を返す。
	var retArray = new Array();
	retArray[0] = this;
	
	for(var i = 0; i < separatorList.length; i++){
		var tmpArray = new Array();
		for(var k = 0; k < retArray.length; k++){
			tmpArray[k] = retArray[k].split(separatorList[i]);
			if(tmpArray[k][tmpArray[k].length - 1] == ""){
				tmpArray[k].splice(tmpArray[k].length - 1, 1);
				if(tmpArray[k] && tmpArray.length > 0){
					for(var m = 0; m < tmpArray[k].length; m++){
						tmpArray[k][m] += separatorList[i];
					}
				}
			} else{
				for(var m = 0; m < tmpArray[k].length - 1; m++){
					tmpArray[k][m] += separatorList[i];
				}
			}
		}
		retArray = new Array();
		retArray = retArray.concat.apply(retArray, tmpArray);
	}
	
	return retArray;
}
String.prototype.trim = function(str){
	return this.replace(/^[ 　	]+|[ 　	]+$/g, "").replace(/\n$/g, "");
}
//http://d.hatena.ne.jp/favril/20090514/1242280476
String.prototype.isKanjiAt = function(index){
	var u = this.charCodeAt(index);
	if( (0x4e00  <= u && u <= 0x9fcf) ||	// CJK統合漢字
		(0x3400  <= u && u <= 0x4dbf) ||	// CJK統合漢字拡張A
		(0x20000 <= u && u <= 0x2a6df) ||	// CJK統合漢字拡張B
		(0xf900  <= u && u <= 0xfadf) ||	// CJK互換漢字
		(0x2f800 <= u && u <= 0x2fa1f)){ 	// CJK互換漢字補助
		return true;
	}
    return false;
}
String.prototype.isHiraganaAt = function(index){
	var u = this.charCodeAt(index);
	if(0x3040 <= u && u <= 0x309f){
		return true;
	}
	return false;
}
String.prototype.isKatakanaAt = function(index){
	var u = this.charCodeAt(index);
	if(0x30a0 <= u && u <= 0x30ff){
		return true;
	}
	return false;
}
String.prototype.isHankakuKanaAt = function(index){
	var u = this.charCodeAt(index);
	if(0xff61 <= u && u <= 0xff9f){
		return true;
	}
	return false;
}

//
// メインクラス
//

function AI(){
	//ブラウザチェック
	this.checkBrowser();
	//サブクラス
	this.input = new AI_Input(this);
	this.wordRecognition = new AI_WordRecognition(this);
	this.IOManager = new AI_IOManager(this);
	this.memory = new AI_Memory(this);
	//出力関連
	this.outputTimer = null;
	this.messageBox = null;
	this.messageBoxBuffer = "";
	this.maxMessageStringLength = 0xffffff;
	this.debugBox = null;
	this.debugBoxBuffer = "";
	this.maxDebugStringLength = 0xffff;
	this.downloadBox = null;
}
AI.prototype = {
	UUID_MemoryFile: "42e11880-62b8-46ea-a1c4-481264d4440d",
	sendToAI: function(str){
		this.debug("**** Start thinking ****\n");
		this.debug("input:[" + str + "]\n");
		this.input.appendInput(str);
		for(;;){
			//入力処理ループ
			var s = this.input.getSentence();
			if(s === undefined){
				break;
			}
			this.message("User> " + s + "\n", true);
			
			//強制的に画面更新
			this.outputShowTick();
		}
		this.wordRecognition.sortCandidateWordListByWordCount();
		this.wordRecognition.computeEachWordLevel();
		this.wordRecognition.sortCandidateWordListByWordLevel();
		this.wordRecognition.debugShowCandidateWordList();
		this.memory.saveMemory();
		this.debug("**** End thinking ****\n");
	},
	sendTextFromFileToAI: function(str, name, modDate){
		this.debug("sendTextFromFileToAI: " + modDate.toLocaleString() + " [" + name + "]\n");
		//ひとまずセーブデータ読み込み機能のみを実装
		if(str.indexOf(this.UUID_MemoryFile) == 0){
			//UUID_MemoryFileが先頭にあるならば、これは記憶データファイルである。
			this.debug("UUID_MemoryFile Found.\n");
			this.memory.loadMemory(str);
		} else{
			//まるごとAIへ入力してみる
			this.sendToAI(str);
		}
	},
	setMessageBoxDOMObject: function(mBoxObj){
		this.messageBox = mBoxObj;
		this.setOutputTimer();
	},
	setDebugBoxDOMObject: function(dBoxObj){
		this.debugBox = dBoxObj;
		this.setOutputTimer();
	},
	message: function(str, noPrefix){
		if(this.messageBox){
			if(!noPrefix){
				this.messageBoxBuffer += "AI> " + str;
			} else{
				this.messageBoxBuffer += str;
			}
		}
	},
	debug: function(str){
		if(this.debugBox){
			this.debugBoxBuffer += str;
		}
	},
	outputShowTick: function(){
		if(this.messageBox && this.messageBoxBuffer != ""){
			//messageBox
			var str = this.messageBox.innerHTML + this.messageBoxBuffer;
			this.messageBoxBuffer = "";
			if(str.length > this.maxMessageStringLength){
				str = str.slice(str.length - (this.maxMessageStringLength >> 1));
			}
			this.messageBox.innerHTML = str;
			this.messageBox.scrollTop = this.messageBox.scrollHeight;
		}
		if(this.debugBox && this.debugBoxBuffer != ""){
			//debugBox
			var str = this.debugBox.innerHTML + this.debugBoxBuffer;
			this.debugBoxBuffer = "";
			if(str.length > this.maxDebugStringLength){
				str = str.slice(str.length - (this.maxDebugStringLength >> 1));
			}
			this.debugBox.innerHTML = str;
			this.debugBox.scrollTop = this.debugBox.scrollHeight;
		}
	},
	setOutputTimer: function(){
		if(!this.messageBox && !this.debugBox){
			//すべて無効だったらタイマーの動作自体を止める
			window.clearTimeout(this.outputTimer);
			this.outputTimer = null;
		} else if(!this.outputTimer){
			//どれかが有効でかつタイマーが止まっていたらスタートさせる
			var that = this;
			this.outputTimer = window.setInterval(function(){that.outputShowTick();}, 50);
		}
	},
	checkBrowser: function(){
		if(!window.File){
			this.message("System> このブラウザは記憶保存(HTML5FileAPI)に対応していません。", true);
		}
	},
}

//
//サブクラス
//

function AI_WordRecognition(env){
	this.env = env;
}
AI_WordRecognition.prototype = {
	slideLookUpCandidateWordByHistory: function(input){
		var h = this.env.input.historyList;
		var cList = new Array();
		for(var i = 0, iLen = input.length; i < iLen; i++){
			//input character loop
			var iStr = input.substr(i);
			var cLen = 0;
			var cStr = "";
			for(var j = 0, jLen = h.length; j < jLen; j++){
				//history entry loop
				var hStrBase = h[j];
				for(var k = 0, kLen = hStrBase.length; k < kLen; k++){
					//history character loop
					var hStr = hStrBase.substr(k);
					var m = hStr.compareLeftHand(iStr);
					if(m > cLen && m != iStr.length){
						cLen = m;
					}
				}
			}
			if(cLen > 0){
				cList.pushUnique(new AI_CandidateWordTag(iStr.substr(0, cLen))).wordCount++;
			}
		}
		//フィルター
		this.filterCandidateWordList00(cList);
		this.filterCandidateWordList01(cList, 2);
		//追加
		this.mergeCandidateWordList(cList);
	},
	appendCandidateWordList: function(strTag){
		var s = this.env.memory.candidateWordList.isIncluded(strTag, function(a, b){ return (a.str == b.str); });
		if(s){
			s.wordCount++;
		} else{
			strTag.wordCount = 1;
			this.env.memory.appendMemoryTag(strTag);
		}
	},
	mergeCandidateWordList: function(strTagList){
		for(var i = 0, iLen = strTagList.length; i < iLen; i++){
			this.appendCandidateWordList(strTagList[i]);
		}
	},
	debugShowCandidateWordList: function(){
		this.env.debug("candidateWordList:\n");
		var c = this.env.memory.candidateWordList;
		for(var i = 0, iLen = c.length; i < iLen; i++){
			this.env.debug(c[i].wordCount.toString() + " :" + c[i].wordLevel.toString() + " :" + c[i].str + "\n");
		}
		this.env.debug("candidateWordList end\n");
	},
	filterCandidateWordList00:function(cList){
		//00:長い単語に含まれており、かつ出現頻度が長い単語と等しい単語を削除
		//cList内の候補単語に対して、フィルターをかける。
		var iLen = cList.length;
		if(iLen < 1){
			return;
		}
		var baseStrTag = cList[0];
		for(var i = 1; i < iLen; i++){
			var c = cList[i];
			if(baseStrTag.str.indexOf(c.str) != -1){
				//c.strはbaseStrTag.strに含まれている
				if(baseStrTag.wordCount == c.wordCount){
					//かつ出現回数が等しいので不要な単語
					//後で削除する。出現回数を0にマークする。
					c.wordCount = 0;
				}
			}
			if(c.wordCount > 0){
				//単語は削除されなかった、つまり異なる単語なので、baseStrTagを更新
				var baseStrTag = c;
			}
		}
		//削除処理
		for(var i = 1; i < iLen; i++){
			var c = cList[i];
			if(c.wordCount == 0){
				cList.removeByIndex(i);
				i--;
				iLen--;
			}
		}
	},
	filterCandidateWordList01:function(cList, minLen){
		//01:minLenに満たない文字数の候補を削除
		//削除処理
		var iLen = cList.length;
		for(var i = 0; i < iLen; i++){
			if(cList[i].str.length < minLen){
				cList.removeByIndex(i);
				i--;
				iLen--;
			}
		}
	},
	filterCandidateWordList02:function(cList, minCount){
		//02:minCountに満たない出現回数の候補を削除
		//削除処理
		var iLen = cList.length;
		for(var i = 0; i < iLen; i++){
			if(cList[i].wordCount < minCount){
				cList.removeByIndex(i);
				i--;
				iLen--;
			}
		}
	},
	sortCandidateWordListByWordCount: function(){
		this.env.memory.candidateWordList.stableSort(function(a, b){
			return a.wordCount - b.wordCount;
		});
	},
	sortCandidateWordListByWordLevel: function(){
		this.env.memory.candidateWordList.stableSort(function(a, b){
			return a.wordLevel - b.wordLevel;
		});
	},
	computeWordLevel: function(strTag){
		var s = strTag.str;
		var iLen = s.length;
		var f = 0;
		strTag.wordLevel = 0;
		//文字列中の文字種数を数える
		for(var i = 0; i < iLen; i++){
			if(s.isHiraganaAt(i)){
				f |= 0x01;
			} else if(s.isKanjiAt(i)){
				f |= 0x02;
			} else if(s.isKatakanaAt(i)){
				f |= 0x04;
			} else if(s.isHankakuKanaAt(i)){
				f |= 0x08;
			} else{
				f |= 0x10;
			}
		}
		for(var i = 0; i < 5; i++){
			if((f & 0x01) != 0){
				strTag.wordLevel++;
			}
			f >>>= 1;
		}
		strTag.wordLevel = 1 / strTag.wordLevel;
		return;
	},
	computeEachWordLevel: function(){
		var iLen = this.env.memory.candidateWordList.length;
		for(var i = 0; i < iLen; i++){
			this.computeWordLevel(this.env.memory.candidateWordList[i]);
		}
	}
}

function AI_Memory(env){
	this.env = env;
	
	//ルート
	this.root = new Array();
	//サブリスト
	this.candidateWordList = new Array();
}
AI_Memory.prototype = {
	saveMemory: function(){
		var m = this.env.IOManager;
		var s = this.env.UUID_MemoryFile + "\n";
		var cl = this.root;
		for(var i = 0, iLen = cl.length; i < iLen; i++){
			if(cl[i] instanceof AI_MemoryTag){
				s += cl[i].parseToStringData() + "\n";
			}
		}
		var d = new Blob([s]);
		if(d){
			m.showDownloadLink(d);
		}
	},
	loadMemory: function(str){
		var a, t, d, m, q;
		
		this.env.debug("Memory loading...\n");
		a = str.splitByArray(["\n"]);
		
		for(var i = 1, iLen = a.length; i < iLen; i++){
			try{
				d = eval(a[i]);
			} catch(e){
				this.env.debug(i + ": " + e + "\n");
				continue;
			}
			q = d.type;
			if(q == AI_MemoryTag.prototype.Type_CandidateWord){
				t = new AI_CandidateWordTag();
			} else{
				t = new AI_MemoryTag();
			}
			AI_MemoryTag.prototype.loadFromMemoryData.call(t, d);
			this.appendMemoryTag(t);
		}
		this.env.debug("Memory loading done.\n" + this.root.length + " tags exist.\n");
	},
	appendMemoryTag: function(tag){
		//同じUUIDのタグがあった場合はデバッグ表示をして、新たなものに置き換える。
		var s = this.root.isIncluded(tag, function(a, b){ return (a.uuid == b.uuid); });
		if(s){
			this.env.debug("appendMemoryTag: duplicated UUID " + tag.uuid + ", overwritten.\n");
			this.root.removeAnObject(s);
		}
		//ルートに追加
		this.root.push(tag);
		//タグに合わせてそれぞれのサブリストに分配
		if(tag instanceof AI_CandidateWordTag){
			this.candidateWordList.push(tag);
		}
	},
}

function AI_IOManager(env){
	this.env = env;
}
AI_IOManager.prototype = {
	//http://www.atmarkit.co.jp/ait/articles/1112/16/news135_2.html
	//http://qiita.com/mohayonao/items/fa7d33b75a2852d966fc
	showDownloadLink: function(blobData){
		if(window.URL){
			this.env.downloadBox.innerHTML = "<a href='" + window.URL.createObjectURL(blobData) + "' target='_blank'>ダウンロード</a>";
		} else if(window.webkitURL){
			this.env.downloadBox.innerHTML = "<a href='" + window.webkitURL.createObjectURL(blobData) + "' target='_blank'>ダウンロード</a>";
		} else{
			window.alert("Can't create URL");
		}
	}
}

function AI_Input(env){
	this.env = env;
	this.historyList = new Array();
	this.sentenceList = new Array();
}
AI_Input.prototype = {
	maxHistoryLength: 16,
	sentenceSeparator: [
		"。",
		"！",
		"？",
		"!",
		"?",
		"\n",
	],
	appendInput: function(str){
		var sList = str.splitByArray(this.sentenceSeparator);
		
		this.sentenceList = this.sentenceList.concat(sList)
	},
	getSentence: function(){
		//改行のみの文は破棄
		for(;;){
			if(this.sentenceList.length <= 0){
				return undefined;
			}
			var retv = this.sentenceList[0];
			this.sentenceList.splice(0, 1);
			retv = retv.trim();
			if(retv != ""){
				break;
			}
		}
		//ここで単語候補抽出を行っておく
		this.env.wordRecognition.slideLookUpCandidateWordByHistory(retv);
		//
		this.appendHistory(retv);
		return retv;
	},
	appendHistory: function(str){
		this.historyList.push(str);
		if(this.historyList.length > this.maxHistoryLength){
			this.historyList.splice(0, this.maxHistoryLength >> 1);
		}
	},
}

function AI_MemoryTag(typeUUIDStr){
	this.uuid = null;
	this.initUUID();
	this.type = typeUUIDStr;
	this.createdDate = new Date();
}
AI_MemoryTag.prototype = {
	Type_CandidateWord: "2fba8fc1-2b9a-46e0-8ade-455c0bd30637",
	//http://codedehitokoto.blogspot.jp/2012/01/javascriptuuid.html
	initUUID: function(){
		if(!this.uuid){
			var f = this.initUUIDSub;
			this.uuid = f() + f() + "-" + 
						f() + "-" + 
						f() + "-" + 
						f() + "-" + 
						f() + f() + f();
		}
	},
	initUUIDSub: function(){
		return (((1 + Math.random()) * 0x10000) | 0).toString(16).toLowerCase().substring(1);
	},
	parseToStringData: function(data){
		//uuid:type:
		var d = new Object();
		//
		d.id = this.uuid;
		d.type = this.type;
		d.cDate = this.createdDate.toUTCString();
		//
		d.data = data;
		//
		return this.parseArrayToStringSource(d);
	},
	loadFromMemoryData: function(data){
		this.uuid = data.id;
		this.type = data.type;
		this.createdDate = new Date(data.cDate);
		if(data.data){
			if(this.loadFromMemoryData != AI_MemoryTag.prototype.loadFromMemoryData){
				this.loadFromMemoryData(data.data);
			}
		}
	},
	escapeForMemory: function(str){
		return "\"" + str.replaceAll(":", "@:").replaceAll("\"", "\\\"") + "\"";
	},
	unescapeForMemory: function(str){
		return str.replaceAll("@:", ":");
	},
	parseArrayToStringSource: function(anArray){
		if(!anArray){
			return "null";
		}
		var srcstr = "var t=";
		srcstr += this.parseArrayToStringSourceSub(anArray);
		srcstr += ";t;";
		return srcstr;
	},
	parseArrayToStringSourceSub: function(anArray){
		if(!anArray){
			return "null";
		}
		var srcstr = "{";
		for(var k in anArray){
			var v = anArray[k];
			var t = Object.prototype.toString.call(v);
			if(v instanceof Array){
				srcstr += k + ":" + this.parseArrayToStringSourceSub(v) + ",";
			} else if(!isNaN(v) && v.toString().replace(/\s+/g, "").length > 0){
				//isNaNだけでは数値判定できないので、文字列化後の空白文字を削除した長さも検査している。
				srcstr += k + ":" + v + ",";
			} else if(t == "[object String]"){
				//文字列として変換
				srcstr += k + ":'" + v + "',";
			} else if(t == "[object Object]"){
				srcstr += k + ":" + this.parseArrayToStringSourceSub(v) + ",";
			} else{
				srcstr += k + ":undefined,";
			}
		}
		if(srcstr.charAt(srcstr.length - 1) == ","){
			//最後の余計なカンマを削除
			srcstr = srcstr.slice(0, srcstr.length - 1);
		}
		srcstr += "}";
		return srcstr;
	},
}

var AI_CandidateWordTag = function(str){
	AI_CandidateWordTag.base.call(this, AI_CandidateWordTag.base.prototype.Type_CandidateWord);
	this.str = str;
	this.wordCount = 0;
	this.wordLevel = 0;
}.extend(AI_MemoryTag, {
	parseToStringData: function(){
		//uuid:type:str:wordCount:wordLevel
		var e = this.escapeForMemory;
		var d = new Object();
		d.s = this.str;
		d.c = this.wordCount;
		d.l = this.wordLevel.toString();
		
		return AI_CandidateWordTag.base.prototype.parseToStringData.call(this, d);
	},
	loadFromMemoryData: function(data){
		this.str = data.s;
		this.wordCount = data.c;
		this.wordLevel = data.l;
	},
});

var AI_WordTag = function(str){
	AI_WordTag.base.call(this, AI_CandidateWordTag.base.prototype.Type_CandidateWord);
	this.str = str;
	this.wordCount = 0;
}.extend(AI_MemoryTag, {
	parseToStringData: function(){
		//uuid:type:str:wordCount:wordLevel
		var e = this.escapeForMemory;
		var d = new Object();
		d.s = this.str;
		d.c = this.wordCount;
		return AI_CandidateWordTag.base.prototype.parseToStringData.call(this) + e(this.parseArrayToStringSource(d));
	},
	loadFromMemoryData: function(data){
		this.str = data.s;
		this.wordCount = data.c;
	},
});


