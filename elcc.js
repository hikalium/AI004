// ELCHNOSCompiler for AI004

function ELCHNOSCompiler(env){
	this.env = env;
	
	this.structure = new Array();
	this.currentStructure = this.structure;
	this.structureStack = new Array();
}
ELCHNOSCompiler.prototype = {
	keyWordList: [
		"\n",
		"\t",
		" ",
		"{",
		"}",
		"(",
		")",
		";",
		"//",
		"/*",
		"*/",
		",",
		"[",
		"]",
		"=",
		"+",
		"-",
		"*",
		"/",
	],
	errorMessageList: [
		"Trap.",
		"Incompatible value attribute.",
		"Unexpected identifier."
	],
	
	Flag_Sign_Signed			: 0x00000001,
	Flag_Sign_Unsigned			: 0x00000002,
	
	compile: function(str){
		var line = str.split("\n");
		var separated = str.splitByArraySeparatorSeparated(this.keyWordList);
		
		//コメント削除
		var commentLineStartIndex = -1;
		var commentBlockStartIndex = -1;
		var commentBlockCount = 0;
		var linesInCommentBlock = 0;
		for(var i = 0, iLen = separated.length; i < iLen; i++){
			var s = separated[i];
			if(commentLineStartIndex == -1){
				if(s == "//"){
					//行コメント開始
					commentLineStartIndex = i;
				}
			} else{
				if(s == "\n"){
					//行コメント終了
					var len = i - commentLineStartIndex;
					separated.splice(commentLineStartIndex, len);
					iLen -= len;
					i -= len;
					commentLineStartIndex = -1;
				}
			}
			if(s == "/*"){
				//ブロックコメント開始
				if(commentBlockCount == 0){
					commentBlockStartIndex = i;
				}
				commentBlockCount++;
			} else if(s == "*/"){
				//ブロックコメント終了
				commentBlockCount--;
				if(commentBlockCount == 0){
					var len = i - commentBlockStartIndex + 1;
					var padding = new Array();
					padding.push(commentBlockStartIndex);
					padding.push(len);
					for(var j = 0, jLen = linesInCommentBlock; j < jLen; j++){
						padding.push("\n");
					}
					separated.splice.apply(separated, padding);
					i -= len;
					iLen -= len;
					linesInCommentBlock = 0;
				} else if(commentBlockCount < 0){
					this.env.debug("Too many block comment closure [].\n");
					return;
				}
			} else if(commentBlockCount < 0 && s == "\n"){
				linesInCommentBlock++;
			}
		}
		
		//不要な文字を削除
		separated.removeAllObject("\t");
		separated.removeAllObject(" ");
		
		var currentExpression = null;
		var numValSignFlag = 0;
		var numValBits = 0;
		var pointerCount = 0;
		var lineCount = 1;
		var blockLevel = 0;
		var DestinationOperand = null;
		var mode = 0;
		var unexpected = false;
		var errno = 2;
		var o;
		var f;
			//次に期待する値を示す。
			// 0: 何が来るかわからない
			//
			//10: 変数・定数の前置属性・型・または識別子
			//11: 変数・定数の識別子またはポインタ属性
			//12: 変数・定数の後置属性・初期化式または終端記号、もしくは連続した変数宣言の区切り
			//13: 変数・定数の初期化式または終端記号、もしくは連続した変数宣言の区切り
			//14: 配列長の数値部分
			//15: 配列長指定終了の閉じ括弧
			//16: 初期化式の開始括弧もしくは値
			//17: 初期化式の値部分または終了括弧
			//18: 初期化式の区切りまたは終了括弧
			//19: 終端記号
			//
			//50: 関数名
			//51: 引数開始括弧
			//52: 引数or引数終了括弧
			//53: 引数区切りor引数終了括弧
			//54: 関数内部開始括弧
			//
			//60: 識別子に対する何らかの操作の開始
			//
			//71: 評価式の内容または終端記号
			
		for(var i = 0, iLen = separated.length; i < iLen; i++){
			var s = separated[i].toLowerCase();
			//this.env.debug((i + 1) + ":" + s + "\n");
			
			if(s == "\n"){
				//デバッグ用行数カウント
				lineCount++;
				continue;
			//予約語
			} else if(s == "signed" && (mode == 0 || mode == 10)){
				//符号あり
				if(numValSignFlag == 0){
					numValSignFlag |= this.Flag_Sign_Signed;
					mode = 10;
				} else{
					unexpected = true;
					errno = 1;
				}
			} else if(s == "unsigned" && (mode == 0 || mode == 10)){
				//符号なし
				if(numValSignFlag == 0){
					numValSignFlag |= this.Flag_Sign_Unsigned;
					mode = 10;
				} else{
					unexpected = true;
					errno = 1;
				}
			} else if(s == "char"  && (mode == 0 || mode == 10 || mode == 11)){
				//char 8bit符号あり
				numValBits = 8;
				mode = 11;
			} else if(s == "int" && (mode == 0 || mode == 10 || mode == 11)){
				//int 8bit符号あり
				numValBits = 32;
				mode = 11;
			} else if(s == ";" && (mode == 0 || mode == 12 || mode == 13 || mode == 19 || mode == 71)){
				if(mode == 12 || mode == 13 || mode == 19){
					//変数または定数の定義終了
					numValBits = 0;
					numValSignFlag = 0;
					console.log(currentExpression);
					currentExpression = null;
					mode = 0;
				} else if(mode == 71){
					//評価式終端
					console.log(currentExpression);
					currentExpression = null;
					mode = 0;
				} else{
					unexpected = true;
				}
			} else if(s == "=" && (mode == 13 || mode == 60)){
				if(mode == 13){
					//変数・定数初期化式開始
					mode = 16;
				} else if(mode == 60 && DestinationOperand){
					//代入操作追加
					var f = new ELCHNOSCompiler_ExpressionStructure_Expression(this.env);
					f.pushOperand(DestinationOperand);
					f.pushOperator(s);
					
					this.currentStructure.push(f);
					currentExpression = f;
					
					DestinationOperand = null;
					mode = 71;
				} else{
					unexpected = true;
				}
			} else if(s == "*" && (mode == 11)){
				//ポインタ属性の付加
				pointerCount++;
			} else if(s == "," && (mode == 18 || mode == 12 || mode == 13)){
				if(mode == 18){
					//初期化式の区切り
					mode = 17;
				} else if(mode == 12 || mode == 13){
					//連続した変数宣言の区切り
					console.log(currentExpression);
					currentExpression = null;
					mode = 11;
				} else{
					unexpected = true;
				}
			//括弧系
			} else if(s == "[" && (mode == 12)){
				//配列の長さの定義開始
				mode = 14;
			} else if(s == "]" && (mode == 15)){
				//配列の長さの定義終了
				mode = 13;
			} else if(s == "{" && (mode == 16 || mode == 54)){
				if(mode == 16){
					//初期化式の開始括弧
					mode = 17;
				} else if(mode == 54){
					//54: 関数内部開始括弧
					currentExpression = null;
					mode = 0;
				} else{
					unexpected = true;
				}
			} else if(s == "}" && (mode == 17 || mode == 18 || mode == 0)){
				if(mode == 17 || mode == 18){
					//初期化式の終了括弧
					mode = 19;
				} else if(mode == 0){
					if(this.structureStack.length > 0){
						console.log(this.currentStructure);
						this.restoreCurrentStructure;
					} else{
						unexpected = true;
					}
				}
			} else if(s == "(" && (mode == 51)){
				//51: 引数開始括弧
				mode = 52;
			} else if(s == ")" && (mode == 52 || mode == 53)){
				//52: 引数or引数終了括弧
				//53: 引数区切りor引数終了括弧
				mode = 54;
			//リストにない予約語
			} else if(s == "procedure" && (mode == 0)){
				//関数宣言
				var f = new ELCHNOSCompiler_ExpressionStructure_Function();
				this.changeCurrentStructure(f.structure)
				currentExpression = f;
				
				mode = 50;
			//予約語以外
			} else if(mode == 11){
				//変数または定数の宣言
				var v = new ELCHNOSCompiler_ExpressionStructure_Variable();
				v.bits = numValBits;
				v.isSigned = (numValSignFlag == 0) ? false : (0 != (numValSignFlag & this.Flag_Sign_Signed));
				s = separated[i];
				v.isPointer = (pointerCount != 0) ? true : false;
				pointerCount = 0;
				if(s.length > 0){
					v.identifier = s;
					
					this.currentStructure.push(v);
					currentExpression = v;
					
					mode = 12;
				} else{
					unexpected = true;
				}
			} else if(mode == 14){
				currentExpression.length = parseInt(s);
				mode = 15;
			} else if(mode == 17){
				//定数値のみ対応
				currentExpression.initValue.push(parseInt(s));
				mode = 18;
			} else if(mode == 50){
				currentExpression.identifier = s;
				mode = 51;
			} else{
				//現在のスコープを検索
				o = this.currentStructure.isIncluded(s, function(aryobj, obj){ return (aryobj.identifier == obj) });
				if(!o){
					//グローバルスコープを検索
					o = this.structure.isIncluded(s, function(aryobj, obj){ return (aryobj.identifier == obj) });
				}
				if(mode == 0){
					//DestinationOperandから操作式は始まる
					if(o){
						DestinationOperand = o;
						mode = 60;
					} else{
						unexpected = true;
					}
				} else if(mode == 71){
					//評価式オペランド
					if(o){
						currentExpression.pushOperand(o);
					} else if(!isNaN(s)){
						currentExpression.pushOperand(s);
					} else{
						unexpected = true;
					}
				} else{
					unexpected = true;
				}
			}
			if(unexpected){
				//期待されていない値
				this.raiseError(2, lineCount, [s, mode]);
				return;
			}
		}
	},
	raiseError: function(errno, lineCount, infoArray){
		if(errno < 0 || this.errorMessageList.length <= errno){
			this.env.debug(lineCount + ":Error" + errno.toString().toUpperCase() + ":Unknown\n");
		} else{
			this.env.debug(lineCount + ":Error" + errno.toString().toUpperCase() + ":" + this.errorMessageList[errno] + "\n");
		}
		if(infoArray){
			this.env.debug("  ErrorInfo:" + infoArray.toString() + "\n");
		}
	},
	changeCurrentStructure: function(newstructure){
		this.structureStack.push(this.currentStructure);
		this.currentStructure = newstructure;
	},
	restoreCurrentStructure: function(){
		this.currentStructure = this.structureStack.pop();
	}
}

function ELCHNOSCompiler_ExpressionStructure_Variable(){
	this.bits = 0;
	this.length = 0;
	this.isSigned = false;
	this.isPointer = false;
	this.identifier = null;
	this.initValue = new Array();
}
ELCHNOSCompiler_ExpressionStructure_Variable.prototype = {

}

function ELCHNOSCompiler_ExpressionStructure_Function(){
	this.structure = new Array();
	this.identifier = null;
}
ELCHNOSCompiler_ExpressionStructure_Function.prototype = {

}

function ELCHNOSCompiler_ExpressionStructure_Expression(env){
	this.env = env;
	this.evalStack = new Array();
	this.evalOperatorStack = new Array();
	this.lastOperatorPriority = ELCHNOSCompiler_ExpressionStructure_Expression.prototype.operatorPriorityList.length;
}
ELCHNOSCompiler_ExpressionStructure_Expression.prototype = {
	operatorPriorityList: [
		"/",
		"*",
		"-",
		"+",
		//"/=",
		//"+=",
		//"-=",
		//"+=",
	],
	pushOperand: function(identifier){
		this.evalStack.push(identifier);
	},
	pushOperator: function(operator){
		var p = this.getOperatorPriority(operator);
		if(this.lastOperatorPriority >= p){
			//とりあえずとっておく
			this.evalOperatorStack.push(operator);
		} else{
			//優先順位がより高い演算子を先に積んでおき、そのあと自分をとっておく
			for(var i = 0, iLen = this.evalOperatorStack.length; i < iLen; i++){
				var o = this.evalOperatorStack.pop();
				if(this.getOperatorPriority(o) < p){
					this.evalStack.push(o);
				} else{
					this.evalOperatorStack.push(o);
					break;
				}
			}
			this.evalOperatorStack.push(operator);
		}
		this.lastOperatorPriority = p;
	},
	getOperatorPriority: function(operator){
		for(var i = 0, iLen = this.operatorPriorityList.length; i < iLen; i++){
			if(this.operatorPriorityList[i] == operator){
				break;
			}
		}
		return i;
	},
}