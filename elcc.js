// ELCHNOSCompiler for AI004

function ELCHNOSCompiler(env){
	this.env = env;
	
	this.line = null;
	this.separated = null;
	
	this.structure = new Array();
	this.currentStructure = this.structure;
	this.structureStack = new Array();
	
	//0はエントリポイント(main)用に予約
	this.nextLabelID = 1;
}
ELCHNOSCompiler.prototype = {
	keyWordList: [
		"@asm",
		"@end",
		"//",
		"/*",
		"*/",
		"!=",
		"==",
		"+=",
		"-=",
		"*=",
		"/=",
		"++",
		"--",
		"\n",
		"\t",
		" ",
		"{",
		"}",
		"(",
		")",
		";",
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
		"Unexpected identifier.",
		"Unknown assembly language type.",
		"Invalid expression of OSECPU Binary."
	],
	
	Flag_Sign_Signed			: 0x00000001,
	Flag_Sign_Unsigned			: 0x00000002,
	
	compile: function(str){
		this.line = str.split("\n");
		//分割
		this.separated = str.splitByArraySeparatorSeparatedLong(this.keyWordList);
		//コメント除去
		this.compile_removeComment();
		
		//不要な文字を削除
		this.separated.removeAllObject("\t");
		this.separated.removeAllObject(" ");
		
		console.log(this.separated);
		
		//メイン処理
		var currentExpression = null;
		var numValSignFlag = 0;
		var numValBits = 0;
		var pointerCount = 0;
		var lineCount = 1;
		var blockLevel = 0;
		//var DestinationOperand = null;
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
			//50: 関数名または関数属性
			//51: 引数開始括弧
			//52: 引数or引数終了括弧
			//53: 引数区切りor引数終了括弧
			//54: 関数内部開始括弧
			//
			//60: 評価式の内容または終端記号
			//
			//70: OSECPUアセンブリ直接記述モード
			//71: OSECPUアセンブリ評価式の内容または終端記号
		for(var i = 0, iLen = this.separated.length; i < iLen; i++){
			var s = this.separated[i].toLowerCase();
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
			} else if(s == "char"  && (mode == 0 || mode == 10 || mode == 11 || mode == 52)){
				//char 8bit符号あり
				numValBits = 8;
				if(mode == 0 || mode == 10 || mode == 11){
					mode = 11;
				}
			} else if(s == "int" && (mode == 0 || mode == 10 || mode == 11 || mode == 52)){
				//int 32bit符号あり
				numValBits = 32;
				if(mode == 0 || mode == 10 || mode == 11){
					mode = 11;
				}
			} else if(s == ";" && (mode == 0 || mode == 12 || mode == 13 || mode == 19 || mode == 60 || mode == 71)){
				if(mode == 12 || mode == 13 || mode == 19){
					//変数または定数の定義終了
					numValBits = 0;
					numValSignFlag = 0;
					console.log(currentExpression);
					currentExpression = null;
					mode = 0;
				} else if(mode == 60 || mode == 71){
					//評価式終端
					console.log(currentExpression);
					currentExpression = null;
					if(mode == 60){
						mode = 0;
					} else if(mode == 71){
						mode = 70;
					}
				} else{
					unexpected = true;
				}
			} else if(s == "=" && (mode == 13)){
				if(mode == 13){
					//変数・定数初期化式開始
					mode = 16;
				} else{
					unexpected = true;
				}
			} else if(s == "*" && (mode == 11)){
				//ポインタ属性の付加
				pointerCount++;
			} else if(s == "," && (mode == 18 || mode == 12 || mode == 13 || mode == 53)){
				if(mode == 18){
					//初期化式の区切り
					mode = 17;
				} else if(mode == 12 || mode == 13 || mode == 53){
					//連続した変数宣言の区切り
					if(mode == 12 || mode == 13){
						mode = 11;
					} else if(mode == 53){
						mode = 52;
					}
					console.log(currentExpression);
					currentExpression = null;
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
						this.restoreCurrentStructure();
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
				console.log(currentExpression);
				currentExpression = null;
				for(var j = 0, jLen = this.currentStructure.length; j < jLen; j++){
					//引数番号を付与
					this.currentStructure[j].argumentIndex = j;
				}
				mode = 54;
			} else if(s == "@asm" && (mode == 0)){
				i++;
				s = this.separated[i].toLowerCase();
				if(s == "osecpu"){
					mode = 70;
				} else{
					unexpected = true;
					errno = 3;
				}
			} else if(s == "@end" && (mode == 70)){
				mode = 0;
			//リストにない予約語
			} else if(s == "procedure" && (mode == 0)){
				//関数宣言
				var f = new ELCHNOSCompiler_ExpressionStructure_Function(this);
				this.currentStructure.push(f);
				this.changeCurrentStructure(f.structure);
				currentExpression = f;
				
				mode = 50;
			} else if(s == "inline" && (mode == 50)){
				currentExpression.isInline = true;
			} else if(s == "for" && (mode == 0)){
				//forループ
				//
				//初期化式
				//L1:
				//条件評価式-?>L2
				//実行部分
				//(break->L2)
				//更新式->L1
				//L2:
				i++;
				s = this.separated[i];
				if(s == "("){
					var f = new ELCHNOSCompiler_ExpressionStructure_Loop_for(this);
					this.currentStructure.push(f);
					this.changeCurrentStructure(f.structure);
					currentExpression = f;
					//初期化式
					f.initializer = new ELCHNOSCompiler_ExpressionStructure_Expression(this);
					for(i++; ; i++){
						s = this.separated[i];
						if(s == ";"){
							break;
						}
						f.initializer.pushIdentifier(s);
						if(unexpected){
							break;
						}
					}
					console.log(f.initializer);
					//条件評価式
					if(!unexpected){
						f.conditonalExpression = new ELCHNOSCompiler_ExpressionStructure_Expression(this);
						for(i++; ; i++){
							s = this.separated[i];
							if(s == ";"){
								break;
							}
							f.conditonalExpression.pushIdentifier(s);
							if(unexpected){
								break;
							}
						}
						console.log(f.conditonalExpression);
					}
					//更新式
					if(!unexpected){
						f.incrementalExpression = new ELCHNOSCompiler_ExpressionStructure_Expression(this);
						for(i++; ; i++){
							s = this.separated[i];
							if(s == ")"){
								break;
							}
							f.incrementalExpression.pushIdentifier(s);
							if(unexpected){
								break;
							}
						}
						console.log(f.incrementalExpression);
					}
					//開始括弧
					if(!unexpected){
						i++;
						if(this.separated[i] != "{"){
							unexpected = true;
						}
						currentExpression = null;
					}
				} else{
					unexpected = true;
				}
			} else if(s == "if" && (mode == 0)){
				//if文
				//条件評価式-?>L2
				//実行部分
				//(break->L2)
				//L2:
				i++;
				s = this.separated[i];
				if(s == "("){
					var f = new ELCHNOSCompiler_ExpressionStructure_if(this);
					this.currentStructure.push(f);
					this.changeCurrentStructure(f.structure);
					currentExpression = f;
					//条件評価式
					f.conditonalExpression = new ELCHNOSCompiler_ExpressionStructure_Expression(this);
					for(i++; ; i++){
						s = this.separated[i];
						if(s == ")"){
							break;
						}
						f.conditonalExpression.pushIdentifier(s);
						if(unexpected){
							break;
						}
					}
					console.log(f.conditonalExpression);
					//開始括弧
					if(!unexpected){
						i++;
						if(this.separated[i] != "{"){
							unexpected = true;
						}
						currentExpression = null;
					}
				} else{
					unexpected = true;
				}
			//OSECPUアセンブリ
			} else if(s == "remark" && (mode == 70)){
				//超手抜き
				var b = new ELCHNOSCompiler_ExpressionStructure_OSECPUBinary(this);
				this.currentStructure.push(b);
				//FE	len	...
				b.bin.push(0xfe);
				//len
				i++;
				s = this.separated[i];
				if(s.length == 2){
					var len = parseInt(s, 16);
					b.bin.push(len);
				} else{
					unexpected = true;
					errno = 4;
				}
				//data
				if(!unexpected){
					i++;
					s = this.separated[i];
					if(s.length == len * 2){
						for(var j = 0; j < len; j++){
							b.bin.push(parseInt(s.substr(j * 2, 2), 16));
						}
					} else{
						unexpected = true;
						errno = 4;
					}
				}
				
				if(!unexpected){
					i++;
					if(this.separated[i] != ";"){
						unexpected = true;
					} else{
						//この命令は定数のみで構成されているのでコンパイル済みとマークする
						b.isCompiled = true;
						b = null;
					}
				}
			} else if(s == "call" && (mode == 70)){
				//超手抜き
				var b = new ELCHNOSCompiler_ExpressionStructure_OSECPUBinary(this);
				this.currentStructure.push(b);
				
				//第二引数が何か確認する
				i++;
				s = this.separated[i].toLowerCase();
				if((s.indexOf("p") == 0) && s.length == 3){
					//ポインタレジスタをcall
					//新しいラベル番号をもらう
					var labelID = this.allocateLabelID();
					//PLIMM(P30, labelID)
						//03	reg0	imm32
					b.bin.push(0x03);
					b.bin.push(0x30);
					b.bin.push((labelID >> 24) & 0xFF);
					b.bin.push((labelID >> 16) & 0xFF);
					b.bin.push((labelID >> 8) & 0xFF);
					b.bin.push(labelID & 0xFF);
					//PCP(P3F, Pxx)
						//1E	reg0P	reg1P
					b.bin.push(0x1e);
					b.bin.push(0x3f);
					b.bin.push(parseInt(s.substr(1),16));
					//LB(1, labelID)
						//02	opt	imm32
					b.bin.push(0x02);
					b.bin.push(0x01);
					b.bin.push((labelID >> 24) & 0xFF);
					b.bin.push((labelID >> 16) & 0xFF);
					b.bin.push((labelID >> 8) & 0xFF);
					b.bin.push(labelID & 0xFF);
					//[FE] [01] [00]
					b.bin.push(0xfe);
					b.bin.push(0x01);
					b.bin.push(0x00);
					//終端記号
					i++;
					if(this.separated[i] != ";"){
						unexpected = true;
					} else{
						//この命令は定数のみで構成されているのでコンパイル済みとマークする
						b.isCompiled = true;
						b = null;
					}
				} else{
					unexpected = true;
					errno = 0;
				}
			//予約語以外
			} else if(mode == 11 || mode == 52){
				//変数または定数の宣言
				//52: 引数名
				var v = new ELCHNOSCompiler_ExpressionStructure_Variable(this);
				v.bits = numValBits;
				v.isSigned = (numValSignFlag == 0) ? false : (0 != (numValSignFlag & this.Flag_Sign_Signed));
				s = this.separated[i];
				v.isPointer = (pointerCount != 0) ? true : false;
				pointerCount = 0;
				if(s.length > 0){
					v.identifier = s;
					
					this.currentStructure.push(v);
					currentExpression = v;
					
					//mode:11->12
					//mode:52->53
					mode++;
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
				//関数名
				//大文字小文字を区別
				currentExpression.identifier = this.separated[i];
				mode = 51;
			} else{
				if(mode == 0 || mode == 70 || mode == 60 || mode == 71){
					//大文字小文字を区別
					s = this.separated[i];
					if(mode == 0 || mode == 70){
						//最初の左辺だったら追加処理
						var f = new ELCHNOSCompiler_ExpressionStructure_Expression(this);
						this.currentStructure.push(f);
						currentExpression = f;
					}
					currentExpression.pushIdentifier(s);
					if(!unexpected){
						if(mode == 0){
							mode = 60;
						} else if(mode == 70){
							mode = 71;
						}
					}
				}
			}
			if(unexpected){
				//期待されていない値
				s = this.separated[i];
				this.raiseError(errno, lineCount, [s, mode]);
				console.log(this.structure);
				return;
			}
		}
		console.log(this.structure);
	},
	compile_removeComment: function(){
		//コメント削除
		var commentLineStartIndex = -1;
		var commentBlockStartIndex = -1;
		var commentBlockCount = 0;
		var linesInCommentBlock = 0;
		
		for(var i = 0, iLen = this.separated.length; i < iLen; i++){
			var s = this.separated[i];
			if(commentLineStartIndex == -1){
				if(s == "//"){
					//行コメント開始
					commentLineStartIndex = i;
				}
			} else{
				if(s == "\n"){
					//行コメント終了
					var len = i - commentLineStartIndex;
					this.separated.splice(commentLineStartIndex, len);
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
					this.separated.splice.apply(this.separated, padding);
					i -= len - linesInCommentBlock;
					iLen -= len - linesInCommentBlock;
					linesInCommentBlock = 0;
				} else if(commentBlockCount < 0){
					this.env.debug("Too many block comment closure [].\n");
					return;
				}
			} else if(commentBlockCount > 0 && s == "\n"){
				linesInCommentBlock++;
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
			this.env.debug("  >" + infoArray.toString() + "\n");
		}
	},
	changeCurrentStructure: function(newstructure){
		this.structureStack.push(this.currentStructure);
		this.currentStructure = newstructure;
	},
	restoreCurrentStructure: function(){
		this.currentStructure = this.structureStack.pop();
	},
	searchIdentifier: function(identifier){
		var o;
		var cf = function(aryobj, obj){ return (aryobj.identifier == obj) };
		
		o = this.currentStructure.isIncluded(identifier, cf);
		if(!o){
			for(var i = this.structureStack.length - 1; i >= 0; i--){
				o = this.structureStack[i].isIncluded(identifier, cf);
				if(o){
					break;
				}
			}
		}
		return o;
	},
	isOperator: function(s){
		return (
			s == "=" ||
			s == "+" ||
			s == "-" ||
			s == "*" ||
			s == "/" ||
			s == "!=" ||
			s == "++" ||
			s == "<" ||
			s == "(" ||
			s == ")"||
			s == "," ||
			false
		);
	},
	allocateLabelID: function(){
		this.nextLabelID++;
		return this.nextLabelID - 1;
	},
}

function ELCHNOSCompiler_ExpressionStructure_Variable(compiler){
	this.compiler = compiler;
	this.bits = 0;
	this.length = 0;
	this.isSigned = false;
	this.isPointer = false;
	this.identifier = null;
	this.initValue = new Array();
	//引数として渡されるものであれば、引数の左から数えて何番目かが入る。
	this.argumentIndex = -1;
}
ELCHNOSCompiler_ExpressionStructure_Variable.prototype = {

}

function ELCHNOSCompiler_ExpressionStructure_Function(compiler){
	this.compiler = compiler;
	this.structure = new Array();
	this.identifier = null;
}
ELCHNOSCompiler_ExpressionStructure_Function.prototype = {

}

function ELCHNOSCompiler_ExpressionStructure_Loop_for(compiler){
	this.compiler = compiler;
	this.structure = new Array();
	this.initializer = null;
	this.conditonalExpression = null;
	this.incrementalExpression = null;
	this.isInline = false;
}
ELCHNOSCompiler_ExpressionStructure_Loop_for.prototype = {

}

function ELCHNOSCompiler_ExpressionStructure_if(compiler){
	this.compiler = compiler;
	this.structure = new Array();
	this.conditonalExpression = null;
}
ELCHNOSCompiler_ExpressionStructure_if.prototype = {

}

function ELCHNOSCompiler_ExpressionStructure_Expression(compiler){
	this.compiler = compiler;
	this.evalStack = new Array();
	this.evalOperatorStack = new Array();
	this.lastOperatorPriority = ELCHNOSCompiler_ExpressionStructure_Expression.prototype.operatorPriorityList.length;
	this.startBracketIndexStack = new Array();
}
ELCHNOSCompiler_ExpressionStructure_Expression.prototype = {
	//drawLine(1 + 4, x0, y0, x1, y1, col);
	//->	drawLine 1 4 + x0 y0 x1 y1 col ()
	//f(g(1 + 4 * (2 - 3)), 4 * 2 + 1);
	//->	f g 1 4 2 3 - * + () 4 2 * 1 + ()
	
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
		//オペランドを追加する
		//数値ならば数値自体もしくは等価な文字列
		//オブジェクトであればそのオブジェクトのインスタンスを渡す
		this.evalStack.push(identifier);
	},
	pushOperator: function(operator){
		//演算子を追加する。
		//演算子は文字列で渡す
		if(operator == "("){
			//開き括弧のevalOperatorStack内でのIndexを記憶
			if(this.evalStack[this.evalStack.length - 1] instanceof ELCHNOSCompiler_ExpressionStructure_Function){
				//関数呼び出しの括弧
				//-(index + 1)で記憶しておく
				this.startBracketIndexStack.push(-(this.evalOperatorStack.length + 1));
			} else{
				//式の優先順位を示す括弧
				this.startBracketIndexStack.push(this.evalOperatorStack.length);
			}
			this.evalOperatorStack.push(operator);
		} else if(operator == ")"){
			//開き括弧のインデックスを得る
			//開き括弧までのOperatorを順にevalStackにpushして、括弧内の式を完結させる
			var i = this.startBracketIndexStack.pop();
			for(;;){
				var o = this.evalOperatorStack.pop();
				if(o == "("){
					break;
				} else if(o === undefined){
					//括弧の個数が合わないのでエラー
					this.compiler.unexpected = true;
					return;
				}
				this.evalStack.push(o);
			}
			if(i < 0){
				//関数呼び出しの括弧
				this.evalStack.push("()");
			}
		} else if(operator == ","){
			//現在の階層の式を完結させる
			for(;;){
				var o = this.evalOperatorStack.pop();
				if(o == "("){
					//開き括弧は戻しておく
					this.evalOperatorStack.push(o);
					break;
				} else if(o === undefined){
					//すべてプッシュしたので終了
					break;
				}
				this.evalStack.push(o);
			}
		} else{
			//一般operator
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
		}
	},
	pushIdentifier: function(identifier){
		//識別子を式に追加する。
		//自動的にオペランドか演算子かを判別し、適切にプッシュする。
		//識別子は大文字小文字を区別できる状態で渡すようにする
		//レジスタ直接指定もできる
		
		if(this.isOperator(identifier)){
			//演算子
			this.pushOperator(identifier);
		} else {
			var o = this.compiler.searchIdentifier(identifier);
			if(o){
				//オブジェクトオペランド
				this.pushOperand(o);
			} else if(!isNaN(identifier)){
				//即値オペランド
				this.pushOperand(parseInt(identifier));
			} else{
				//レジスタ名である可能性を確認
				var s = identifier.toLowerCase();
				if((s.indexOf("r") == 0 || s.indexOf("p") == 0) && s.length == 3){
					//レジスタ名指定
					this.pushOperand(s);
				} else{
					this.compiler.unexpected = true;
				}
			}
		}
	},
	getOperatorPriority: function(operator){
		for(var i = 0, iLen = this.operatorPriorityList.length; i < iLen; i++){
			if(this.operatorPriorityList[i] == operator){
				break;
			}
		}
		return i;
	},
	isOperator: function(s){
		return (
			s == "=" ||
			s == "+" ||
			s == "-" ||
			s == "*" ||
			s == "/" ||
			s == "!=" ||
			s == "++" ||
			s == "<" ||
			s == "(" ||
			s == ")"||
			s == "," ||
			false
		);
	},
}

function ELCHNOSCompiler_ExpressionStructure_OSECPUBinary(compiler){
	this.compiler = compiler;
	this.bin = new Array();
	this.isCompiled = false;
}
ELCHNOSCompiler_ExpressionStructure_OSECPUBinary.prototype = {

}