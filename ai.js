//AI004

//開発時クロスドメイン許可で起動するには、
// /Applications/Google\ Chrome.app/ --allow-file-access-from-files --disable-web-security

function AI(messageBoxDOMObject, debugBoxDOMObject){
	//ブラウザチェック
	this.checkBrowser();
	//サブクラス
	this.input = new AI_Input(this);
	this.wordRecognition = new AI_WordRecognition(this);
	this.IOManager = new AI_IOManager(this);
	this.networkManager = new AI_NetworkManager(this);
	this.memory = new AI_Memory(this);
	this.think = new AI_Think(this);
	//出力関連
	var that = this;
	this.tickTimer = window.setInterval(function(){that.tick();}, 100);;
	this.messageBox = null;
	this.messageBoxBuffer = "";
	this.maxMessageStringLength = 0xfffff;
	this.debugBox = null;
	this.debugBoxBuffer = "";
	this.maxDebugStringLength = 0xffff;
	this.downloadBox = null;
	//
	this.setMessageBoxDOMObject(messageBoxDOMObject);
	this.setDebugBoxDOMObject(debugBoxDOMObject);
	this.modeList = [
		this.UUID_Mode_Standard,
		this.UUID_Mode_ReadMemory,
		this.UUID_Mode_SaveMemory,
		this.UUID_Mode_InternalConsole,
		this.UUID_Mode_CompileELCHNOS_OSECPU,
	];
	this.modeProcessList = [
		this.inputProcess_Standard,
		this.inputProcess_ReadMemory,
		this.inputProcess_SaveMemory,
		this.inputProcess_InternalConsole,
		this.inputProcess_CompileELCHNOS_OSECPU,
	];
	this.mode = this.UUID_Mode_Standard;
	this.processByMode = this.inputProcess_Standard;

	this.debug("AI system initialized.\n");
	this.debug("To enter internal console mode,\n  type '#4ca6ed1a-e62e-470b-9d7b-e332f709e48f'.\n");
}
AI.prototype = {
	UUIDStrLen: 36,
	UUID_Mode_Standard: "1186f6f2-c7c4-4532-8f8f-c7dea883825f", 
	UUID_Mode_ReadMemory: "42e11880-62b8-46ea-a1c4-481264d4440d",
	UUID_Mode_SaveMemory: "52360c62-6a8a-4f6e-8bdd-43381996e996",
	UUID_Mode_InternalConsole: "4ca6ed1a-e62e-470b-9d7b-e332f709e48f",
	UUID_Mode_CompileELCHNOS_OSECPU: "17ddde48-7d4c-498f-98d8-3e73f8845028",
	sendToAI: function(str){
		var p, strbaseindex;
		
		this.debug("**** Start inputting ****\n");
		
		//まず入力文字を#で分割したリストを取得
		var ary = str.split("#");
		//モードを確認しつつ実行
		p = -(this.UUIDStrLen + 1);
		for(;;){
			strbaseindex = p + 1 + this.UUIDStrLen;
			p = str.indexOf("#", strbaseindex);
			if(p == -1){
				//終端まで到達
				//それ以前の文字列を入力
				this.processByMode(str.substring(strbaseindex));
				break;
			}
			//まずはモード変更の直前までの文字列を入力
			this.processByMode(str.substring(strbaseindex, p));
			//モード変更要求
			this.changeMode(str.substring(p + 1, p + 1 + this.UUIDStrLen));
		}
		
		this.debug("**** End inputting ****\n");
	},
	changeMode: function(modeUUIDStr){
		for(var i = 0, iLen = this.modeList.length; i < iLen; i++){
			if(this.modeList[i] == modeUUIDStr){
				break;
			}
		}
		if(this.modeList.length <= i){
			this.debug("Unknown mode-UUID. Mode was NOT changed.\n");
			return;
		}
		if(this.modeList[i] === this.UUID_Mode_SaveMemory){
			this.debug("Mode exectute for this once.\n    uuid:" + this.modeList[i] + "\n");
			this.modeProcessList[i].call(this);
		} else{
			this.debug("Mode changed\n    from:" + this.mode + "\n    to  :" + this.modeList[i] + "\n");
			this.mode = this.modeList[i];
			this.processByMode = this.modeProcessList[i];
		}
		
	},
	sendTextFromFileToAI: function(str, name, modDate){
		//ファイルからの読み込み時は、読み込み終了後に読み込み以前のモードに戻る。
		this.debug("sendTextFromFileToAI: " + modDate.toLocaleString() + " [" + name + "]\n");
		var oldmode = this.mode;
		this.sendToAI(str);
		this.changeMode(oldmode);
	},
	setMessageBoxDOMObject: function(mBoxObj){
		this.messageBox = mBoxObj;
	},
	setDebugBoxDOMObject: function(dBoxObj){
		this.debugBox = dBoxObj;
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
	tick: function(){
		//思考処理
		this.think.tick();
		//表示処理
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
	checkBrowser: function(){
		if(!window.File){
			this.message("System> このブラウザは記憶保存(HTML5FileAPI)に対応していません。", true);
		}
	},
	inputProcess_Standard: function(str){
		this.debug("**** Start Processing (Standard) ****\n");
		
		this.debug("input:[" + str + "]\n");
		this.input.appendInput(str);
		this.think.inputting = true;
		
		this.debug("**** End Processing (Standard) ****\n");
	},
	inputProcess_ReadMemory: function(str){
		this.debug("**** Start Processing (ReadMemory) ****\n");
		
		this.memory.loadMemory(str);
		
		this.debug("**** End Processing (ReadMemory) ****\n");
	},
	inputProcess_SaveMemory: function(str){
		this.debug("**** Start Processing (SaveMemory) ****\n");
		
		this.memory.saveMemory();
		
		this.debug("**** End Processing (SaveMemory) ****\n");
	},
	inputProcess_InternalConsole: function(str){
		this.debug("**** Start Processing (InternalConsole) ****\n");
		if(str == "exit"){
			this.debug("Exit InternalConsole.\n");
			this.changeMode(this.UUID_Mode_Standard);
		} else if(str == "show cwl"){
			//show candidateWordList
			this.wordRecognition.sortCandidateWordListByWordCount();
			this.wordRecognition.computeEachWordLevel();
			this.wordRecognition.sortCandidateWordListByWordLevel();
			this.wordRecognition.debugShowCandidateWordList();
		} else if(str.indexOf("inputFromURL ") == 0){
			//webページを読み込む
			//inputFromURL http://www.aozora.gr.jp/cards/000035/files/1567_14913.html
			var url = str.substring(13);
			this.debug("[" + url + "]\n");
			var res = this.networkManager.sendRequestSync("GET", url, null);
			this.debug("[" + res + "]\n");
		} else{
			this.debug("Unknown command [" + str + "].\n");
			this.debug("Command list:\n");
			this.debug("Implemented command list:\n");
			this.debug("  show cwl\n");
			this.debug("  exit\n");
		}
		
		this.debug("**** End Processing (InternalConsole) ****\n");
	},
	inputProcess_CompileELCHNOS_OSECPU: function(str){
		this.debug("**** Start Processing (CompileELCHNOS_OSECPU) ****\n");
		
		var cc = new ELCHNOSCompiler(this);
		cc.compile(str);
		
		this.debug("**** End Processing (CompileELCHNOS_OSECPU) ****\n");
	},
}
