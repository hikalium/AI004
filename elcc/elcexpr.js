//
// 文法構造クラス
//

function ELCHNOSCompiler_ExpressionStructure(compiler, lineCount){
	//共通部分
	this.compiler = compiler;
	this.lineCount = lineCount;
	this.bin = new Array();
}
ELCHNOSCompiler_ExpressionStructure.prototype = {
	createBinary: function(){
		throw new ELCHNOSCompiler_CompileException(5, ["Translation undefined."], this.lineCount);
	},
	appendInstruction_LB: function(opt, labelID){
		//var instr = new WebCPU_Instruction_LB();
		
		this.bin.push(0x01, opt);
		this.appendInstruction_UINT32BE(labelID);
	},
	appendInstruction_UINT32BE: function(data){
		this.bin.push((data >> 24) & 0xFF);
		this.bin.push((data >> 16) & 0xFF);
		this.bin.push((data >> 8) & 0xFF);
		this.bin.push(data & 0xFF);
	},
	appendInstruction_JMP: function(labelID){
		//03	reg0	imm32					PLIMM(reg0, imm32);
		this.bin.push(0x03, 0x3f);
		this.appendInstruction_UINT32BE(labelID);
	},
	appendInstruction_ConditionalJMP: function(cndReg, labelID){
		//04	reg0R									CND(reg0R);
		this.bin.push(0x04, cndReg);
		//03	reg0	imm32					PLIMM(reg0, imm32);
		this.bin.push(0x03, 0x3f);
		this.appendInstruction_UINT32BE(labelID);
	},
	appendInstruction_LIMM3F: function(data){
		this.bin.push(0x02, 0x3f);
		this.appendInstruction_UINT32BE(data);
	},
}

var ELCHNOSCompiler_ExpressionStructure_Block = function(compiler, lineCount){
	//ブロック構造を展開する
	//blockStartLabelID:
	//実行部分
	//(break->blockEndLabelID)
	//blockEndLabelID:
	ELCHNOSCompiler_ExpressionStructure_Block.base.apply(this, arguments);
	this.structure = new Array();
	this.blockStartLabelID = this.compiler.allocateLabelID();
	this.blockEndLabelID = this.compiler.allocateLabelID();
}.extend(ELCHNOSCompiler_ExpressionStructure, {
	createBinary: function(){
		//blockStartLabelID:
		this.appendInstruction_LB(0x00, this.blockStartLabelID);
		//実行部分
		for(var i = 0, iLen = this.structure.length; i < iLen; i++){
			if(this.structure[i] instanceof ELCHNOSCompiler_ExpressionStructure_Variable){
				if(this.structure[i].argumentIndex == -1){
					//ローカル変数割り当て
					this.structure[i].allocateRegisterID(this);
				}
			} else{
				var b = this.structure[i].createBinary();
				if(b !== undefined){
					this.bin.push(b);
				}
			}
		}
		this.compiler.freeAllRegisterOfOwner(this);
		//blockEndLabelID:
		this.appendInstruction_LB(0x00, this.blockEndLabelID);
		return this.bin;
	},
});

var ELCHNOSCompiler_ExpressionStructure_Variable = function(compiler, lineCount){
	// if(!isPointer && labelID != 0):DATA命令によるデータ(ラベル番号の代わり)
	// if(isPointer && labelID == 0):ポインタ変数
	// if(!isPointer && labelID == 0):一般変数
	// if(isImmediateData):即値(initValue[0]がその値)
	// if(argumentIndex == -1):ローカル変数
	// else:引数変数
	ELCHNOSCompiler_ExpressionStructure_Variable.base.apply(this, arguments);
	this.bits = 0;
	//配列でなければ0が入る
	this.length = 0;
	this.isSigned = false;
	this.isPointer = false;
	this.isImmediateData = false;
	//ポインタタイプはcreateBinary実行時に決定される
	this.pointerType = undefined;
	this.identifier = null;
	this.initValue = new Array();
	//引数として渡されるものであれば、引数の左から数えて何番目かが入る。
	this.argumentIndex = -1;
	//dataをポインタとして持つ場合はlabelIDが利用される。
	//それ以外の場合はレジスタIDを利用する。
	this.labelID = 0;
	this.registerID = 0xff;
}.extend(ELCHNOSCompiler_ExpressionStructure, {
	createBinary: function(){
		//配列であればデータ命令のバイナリを作成して返す。
		if(this.length > 0){
			this.assignPointerType();
			//LB(opt:0x1, 0x0);
			this.labelID = this.compiler.allocateLabelID();
			this.appendInstruction_LB(0x01, this.labelID);
			//34	typ32	len32	data...	
			this.bin.push(0x34);
			//typ32
			if(this.pointerType == WebCPU.pType.UINT8){
				this.bin.push(0x00, 0x00, 0x00, 0x03);
			}
			//len32
			this.appendInstruction_UINT32BE(this.length);
			//data
			if(this.pointerType == WebCPU.pType.UINT8){
				for(var i = 0, iLen = this.initValue.length; i < iLen; i++){
					this.bin.push(this.initValue[i] & 0xFF);
				}
				if(i > this.length){
					throw new ELCHNOSCompiler_CompileException(5, ["DATA:Too long length of initValue."], this.lineCount);
				}
				for(iLen = this.length; i < iLen; i++){
					this.bin.push(0x00);
				}
			}
			return this.bin;
		} else{
			//レジスタ変数であれば、スコープに入ったときにレジスタ番号が割り振られるので、今は何もしない
			return undefined;
		}
	},
	allocateRegisterID: function(owner){
		//関数スコープに入ったとき呼ばれる
		this.assignPointerType();
		if(this.isPointer){
			this.registerID = this.compiler.allocatePointerRegister(owner);
		} else{
			this.registerID = this.compiler.allocateIntegerRegister(owner);
		}
	},
	assignPointerType: function(){
		//ポインタタイプ決定
		if(this.length > 0 || this.isPointer){
			if(this.bits == 8 && this.isSigned == false){
				//T_UINT8		:0x03,
				this.pointerType = WebCPU.pType.UINT8;
			} else{
				throw new ELCHNOSCompiler_CompileException(5, ["Not implemented pointer type ", this.pointerType], this.lineCount);
			}
		}
	},
	copyFrom: function(src){
		//自分のidentifierと型は保持したまま、その指す内容をsrcと等価にする。
		//srcにはこのクラスのインスタンス・レジスタ文字列・即値が指定できる
		if(src instanceof ELCHNOSCompiler_ExpressionStructure_Variable){
			//このクラス
			if(!src.isPointer && src.labelID == 0){
				// if(!isPointer && labelID == 0):一般変数
				this.bits = src.bits;
				this.isSigned = src.isSigned;
				this.isPointer = false;
				this.isImmediateData = false;
				this.labelID = 0;
				this.registerID = src.registerID;
			} else{
				throw new ELCHNOSCompiler_CompileException(5, ["Variable:copyFrom: unexpected."], this.lineCount);
			}
		} else if(!isNaN(src)){
			//即値
			src = parseInt(src);
			this.bits = 0;
			//配列でなければ0が入る
			this.isPointer = false;
			this.isImmediateData = true;
			//ポインタタイプはcreateBinary実行時に決定される
			this.initValue = [src];
			this.labelID = 0;
			this.registerID = 0xff;
		} else if(typeof src == "string"){
			src = src.toLowerCase();
			if(src.indexOf("r") == 0){
				//整数レジスタ名
				throw new ELCHNOSCompiler_CompileException(5, ["Variable:copyFrom:Not implemented src IReg"], this.lineCount);
			} else if(src.indexOf("p") == 0){
				//ポインタレジスタ名
				throw new ELCHNOSCompiler_CompileException(5, ["Variable:copyFrom:Not implemented src PReg"], this.lineCount);
			} else{
				throw new ELCHNOSCompiler_CompileException(5, ["Variable:copyFrom: Unexpected."], this.lineCount);
			}
		} else{
			throw new ELCHNOSCompiler_CompileException(5, ["Variable:copyFrom: Unexpected."], this.lineCount);
		}
	},
});

var ELCHNOSCompiler_ExpressionStructure_Function = function(compiler, lineCount){
	ELCHNOSCompiler_ExpressionStructure_Function.base.apply(this, arguments);
	this.identifier = null;
	this.isInline = false;
	this.labelID = 0;
}.extend(ELCHNOSCompiler_ExpressionStructure_Block, {
	createBinary: function(){
		if(this.isInline){
			//インライン関数はその場で展開されるのでバイナリはここでは生成しない
			return undefined;
		} else{
			//レジスタ退避のことはまだ考えてない(実質inline)
			//optを変更できるようにするべき(grobal指定)
			//LB(opt:0x0, this.labelID);
			//引数のことも考えていない
			this.labelID = this.compiler.allocateLabelID();
			this.appendInstruction_LB(0x00, this.labelID);
			//内部
			ELCHNOSCompiler_ExpressionStructure_Function.base.prototype.createBinary.apply(this);
			
			return this.bin;
		}
	},
	createBinary_Inline: function(argStack){
		//argStackは引数が右から詰まったリスト(popしていくと順番通り)
		var argCount = 0;
		if(this.isInline){
			//インライン引数展開
			for(var i = 0, iLen = this.structure.length; i < iLen; i++){
				if(this.structure[i] instanceof ELCHNOSCompiler_ExpressionStructure_Variable){
					if(this.structure[i].argumentIndex != -1){
						//インライン引数展開
						var o = argStack.pop();
						if(o !== undefined && argCount == this.structure[i].argumentIndex){
							argCount++;
							this.structure[i].copyFrom(o);
						} else{
							throw new ELCHNOSCompiler_CompileException(5, ["Function:createBinary_Inline:Too few arguments."], this.lineCount);
						}
					} else{
						break;
					}
				} else{
					break;
				}
			}
			if(argStack.length != 0){
				throw new ELCHNOSCompiler_CompileException(5, ["Function:createBinary_Inline:Too many arguments."], this.lineCount);
			}
			//内部
			ELCHNOSCompiler_ExpressionStructure_Function.base.prototype.createBinary.apply(this);
			return this.bin;
		} else{
			return undefined;
		}
	},
});

var ELCHNOSCompiler_ExpressionStructure_Loop_for = function(compiler, lineCount){
	ELCHNOSCompiler_ExpressionStructure_Loop_for.base.apply(this, arguments);
	this.initializer = null;
	this.conditonalExpression = null;
	this.incrementalExpression = null;
	this.loopLabelID = 0;
	this.endLabelID = 0;
	this.passLabelID = 0;
}.extend(ELCHNOSCompiler_ExpressionStructure_Block, {
	createBinary: function(){
		//initializer
		//loopLabelID:
		//conditonalExpression
		//-?>passLabelID
		//->endLabelID
		//passLabelID:
		//実行部分
		//(break->endLabelID)
		//incrementalExpression
		//->loopLabelID
		//endLabelID:
		
		this.loopLabelID = this.compiler.allocateLabelID();
		this.endLabelID = this.compiler.allocateLabelID();
		//少し手抜き
		this.passLabelID = this.compiler.allocateLabelID();
		
		//initializer
		this.bin.push(this.initializer.createBinary());
		//loopLabelID:
		this.appendInstruction_LB(0x00, this.loopLabelID);
		//conditonalExpression
		//本当はR3fを使いたいけど少し手抜き
		this.bin.push(this.conditonalExpression.createBinary());
		//-?>passLabelID
		this.appendInstruction_ConditionalJMP(this.conditonalExpression.getRegisterIDAsIntegerRegister(this.conditonalExpression.dataStack[0]), this.passLabelID);
		//->endLabelID
		this.appendInstruction_JMP(this.endLabelID);
		//passLabelID:
		this.appendInstruction_LB(0x00, this.passLabelID);
		//実行部分
		ELCHNOSCompiler_ExpressionStructure_Loop_for.base.prototype.createBinary.apply(this);
		//incrementalExpression
		this.bin.push(this.incrementalExpression.createBinary());
		//->loopLabelID
		this.appendInstruction_JMP(this.loopLabelID);
		//endLabelID:
		this.appendInstruction_LB(0x00, this.endLabelID);
		
		return this.bin;
	},
});

var ELCHNOSCompiler_ExpressionStructure_if = function(compiler, lineCount){
	ELCHNOSCompiler_ExpressionStructure_if.base.apply(this, arguments);
	this.conditonalExpression = null;
}.extend(ELCHNOSCompiler_ExpressionStructure_Block, {
	createBinary: function(){
		//conditonalExpression
		//-?>passLabelID
		//->endLabelID
		//passLabelID:
		//実行部分
		//(break->endLabelID)
		//endLabelID:
		
		this.endLabelID = this.compiler.allocateLabelID();
		//少し手抜き
		this.passLabelID = this.compiler.allocateLabelID();
		
		//conditonalExpression
		//本当はR3fを使いたいけど少し手抜き
		this.bin.push(this.conditonalExpression.createBinary());
		//-?>passLabelID
		this.appendInstruction_ConditionalJMP(this.conditonalExpression.getRegisterIDAsIntegerRegister(this.conditonalExpression.dataStack[0]), this.passLabelID);
		//->endLabelID
		this.appendInstruction_JMP(this.endLabelID);
		//passLabelID:
		this.appendInstruction_LB(0x00, this.passLabelID);
		//実行部分
		ELCHNOSCompiler_ExpressionStructure_if.base.prototype.createBinary.apply(this);
		//endLabelID:
		this.appendInstruction_LB(0x00, this.endLabelID);
		
		return this.bin;
	},
});

var ELCHNOSCompiler_ExpressionStructure_Expression = function(compiler, lineCount){
	ELCHNOSCompiler_ExpressionStructure_Expression.base.apply(this, arguments);
	this.evalStack = new Array();
	this.evalOperatorStack = new Array();
	this.lastOperatorPriority = ELCHNOSCompiler_ExpressionStructure_Expression.prototype.operatorPriorityList.length;
	this.startBracketIndexStack = new Array();
	this.mode = ELCHNOSCompiler_ExpressionStructure_Expression.prototype.Mode_Operand;
	this.shouldPushOperatorAfterNextOperand = false;
	//
	this.tmpRegs = new Array();
	this.dataStack = new Array();
}.extend(ELCHNOSCompiler_ExpressionStructure, {
	//drawLine(1 + 4, x0, y0, x1, y1, col);
	//->	drawLine 1 4 + x0 y0 x1 y1 col ()
	//f(g(1 + 4 * (2 - 3)), 4 * 2 + 1);
	//->	f g 1 4 2 3 - * + () 4 2 * 1 + ()
	Mode_Operand: 0,
	Mode_Operator: 1,
	operatorPriorityList: [
		"++",
		"--",
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
		//モード確認
		if(this.mode != this.Mode_Operand){
			throw new ELCHNOSCompiler_CompileException(5, ["Expression:pushOperand:Unexpected identifier.", identifier], this.lineCount);
		}
		this.mode = this.Mode_Operator;
		
		this.evalStack.push(identifier);
		
		if(this.shouldPushOperatorAfterNextOperand){
			this.shouldPushOperatorAfterNextOperand = false;
			var o = this.evalOperatorStack.pop();
			if(o == "-" && this.getImmediateData(identifier) !== undefined){
				//定数のマイナスだったので計算して値として積み直す
				o = -this.getImmediateData(this.evalStack.pop());
			}
			this.evalStack.push(o);
		}
	},
	pushOperator: function(operator){
		//演算子を追加する。
		//演算子は文字列で渡す
		//モード確認
		if(this.mode != this.Mode_Operator){
			if(operator == "*" || operator == "-"){
				this.shouldPushOperatorAfterNextOperand = true;
			} else{
				throw new ELCHNOSCompiler_CompileException(5, ["Expression:pushOperator:Unexpected identifier.", operator], this.lineCount);
			}
		}
		this.mode = this.Mode_Operand;

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
					throw new ELCHNOSCompiler_CompileException(5, ["Expression:pushOperator:Unexpected identifier.", operator], this.lineCount);
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
		//レジスタ直接指定もできる。Rxx, Pxx, 大文字小文字の区別なし。xxは16進。
		
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
				if(this.isRegisterName(s)){
					//レジスタ名指定
					this.pushOperand(s);
				} else{
					throw new ELCHNOSCompiler_CompileException(5, ["Expression:pushIdentifier:Unexpected identifier.", identifier], this.lineCount);
				}
			}
		}
	},
	readExpressionToTerminator: function(startIndex, terminalCharacter){
		//startIndexの次の文字から、terminalCharacterまでの識別子を式に追加する。
		//括弧の対応関係はきちんと数えているので、terminalCharacterに閉じ括弧を指定しても問題ない。
		//戻り値は、最後に追加した識別子の次の文字のseparatedにおけるインデックスで、
		//正常に読み込まれた場合はterminalCharacterを指す。
		var i = startIndex;
		for(i++; ; i++){
			var s = this.compiler.separated[i];
			if(s == undefined){
				throw new ELCHNOSCompiler_CompileException(5, ["Expression:readExpressionToTerminator:Bracket error."], this.lineCount);
			}
			if(this.startBracketIndexStack.length == 0 && s == terminalCharacter){
				break;
			}
			this.pushIdentifier(s);
		}
		return i;
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
			s == "()" ||
			s == "<=" ||
			false
		);
	},
	isRegisterName: function(s){
		s = s.toLowerCase();
		return (s.indexOf("r") == 0 || s.indexOf("p") == 0) && !isNaN(s.substring(1));
	},
	createBinary: function(destRegID){
		//式を計算します。代入式の場合は代入を行います。
		//destRegIDは、条件式などの結果を一時的に保存するために整数レジスタ番号(数値)を指定することができます。
		//指定された場合は最後の計算結果をdestRegIDに格納する処理を行います。
		//計算結果とは、代入式の場合は計算後の右辺、評価式の場合はその評価値となります。
		//まずスタックを処理しやすいように詰め直す
		var stack = new Array();
		var fArgStack = new Array();
		var f = null;
		var op00;
		var op01;
		var op02;
		var opcode = 0xff;
		//残っている演算子から
		for(var i = 0, iLen = this.evalOperatorStack.length; i < iLen; i++){
			this.evalStack.push(this.evalOperatorStack.pop());
		}
		for(var i = 0, iLen = this.evalStack.length; i < iLen; i++){
			stack.push(this.evalStack.pop());
		}
		//console.log(stack.join(","));
		for(var i = 0, iLen = stack.length; i < iLen; i++){
			var o = stack.pop();
			if(this.isOperator(o)){
				if(o == "="){
					//2:代入
					op01 = this.dataStack.pop();
					op00 = this.dataStack.pop();
					if(op00 === undefined || op01 === undefined){
						throw new ELCHNOSCompiler_CompileException(5, ["Expression:createBinary:Operand undefined."], this.lineCount);
					}
					this.createBinary_substitute(op00, op01);
				} else if(	o == "!=" || o == "-" || o == "<=" || o == "+"){
					//2:比較,二項整数演算子
					//21	reg0	reg1	reg2							CMPNE(reg0, reg1, reg2);
					op02 = this.dataStack.pop();
					op01 = this.dataStack.pop();
					if(op01 === undefined || op02 === undefined){
						throw new ELCHNOSCompiler_CompileException(5, ["Expression:createBinary:Operand undefined."], this.lineCount);
					}
					if(o == "!="){
						opcode = 0x21;
					} else if(o == "-"){
						opcode = 0x15;
					} else if(o == "<="){
						opcode = 0x24;
					} else if(o == "+"){
						opcode = 0x14;
					} else{
						throw new ELCHNOSCompiler_CompileException(5, ["Expression:createBinary:Unexpected binary operator.", o], this.lineCount);
					}
					if(opcode != 0xff){
						this.createBinary_TernaryIntegerOperation(op01, op02, opcode);
					}
				} else if(o == "*"){
					//乗算またはポインタアクセス
					op02 = this.dataStack.pop();
					if(this.getRegisterIDAsPointerRegister(op02) !== undefined){
						//ポインタアクセス
						this.createBinary_readPointer(op02);
					} else{
						//乗算
						throw new ELCHNOSCompiler_CompileException(5, ["Expression:createBinary:Not implemented.", o], this.lineCount);
					}
				} else if(o == "++"){
					//increment
					op00 = this.dataStack.pop();
					if(op00 === undefined){
						throw new ELCHNOSCompiler_CompileException(5, ["Expression:createBinary:Operand undefined."], this.lineCount);
					}
					this.createBinary_increment(op00);
				} else if(o == "()"){
					//関数呼び出し
					for(;;){
						op00 = this.dataStack.pop();
						if(op00 instanceof ELCHNOSCompiler_ExpressionStructure_Function){
							f = op00;
							break;
						} else if(op00 === undefined){
							throw new ELCHNOSCompiler_CompileException(5, ["Expression:createBinary:Operand undefined."], this.lineCount);
						} else{
							fArgStack.push(op00);
						}
					}
					if(f.isInline){
						//インライン関数の直接展開
						try{
							this.bin.push(f.createBinary_Inline(fArgStack));
						} catch(e){
							//行数表示を関数呼び出し式の場所に変更
							if(e instanceof ELCHNOSCompiler_CompileException){
								e.lineCount = this.lineCount;
							}
							throw e;
						}
						//これはダミー
						this.dataStack.push("r30");
					} else{
						throw new ELCHNOSCompiler_CompileException(5, ["Expression:createBinary:Not implemented stdcall function."], this.lineCount);
					}
				} else{
					throw new ELCHNOSCompiler_CompileException(5, ["Expression:createBinary:Not implemented operator.", o], this.lineCount);
				}
			} else{
				this.dataStack.push(o);
			}
		}
		if(this.dataStack.length == 1){
			//最終的には1になるはず
			if(destRegID !== undefined){
				//最終代入先が決まっている
				var lastData = this.dataStack.pop();
				//レジスタ利用効率化はあとまわし
				//if(this.tmpRegs.isIncluded(lastReg)){
				//}
				this.createBinary_substitute("r" + destRegID.toString(16), lastData);
			}
		} else{
			throw new ELCHNOSCompiler_CompileException(5, ["Expression:createBinary:dataStack error."], this.lineCount);
		}
		this.compiler.freeAllRegisterOfOwner(this);
		return this.bin;
	},
	createBinary_substitute: function(dest, src){
		var destValue;
		var srcValue;
		
		destValue = this.getRegisterIDAsPointerRegister(dest);
		if(destValue !== undefined){
			//destはポインタレジスタ
			srcValue = this.getLabelID(src);
			if(srcValue !== undefined){
				//srcはラベル
				//ラベル番号からの代入
				//PLIMM
				//03	reg0	imm32
				this.bin.push(0x03, destValue);
				this.appendInstruction_UINT32BE(srcValue);
			} else{
				throw new ELCHNOSCompiler_CompileException(5, ["Expression:createBinary_substitute:Not implemented."], this.lineCount);
			}
		} else{
			destValue = this.getRegisterIDAsIntegerRegister(dest);
			if(destValue !== undefined){
				//destは整数レジスタ
				srcValue = this.getImmediateData(src);
				if(srcValue !== undefined){
					//srcは即値
					//即値代入
					//02	reg0	imm32					LIMM(reg0, imm32);
					this.bin.push(0x02, destValue);
					this.appendInstruction_UINT32BE(srcValue);
				} else{
					srcValue = this.getRegisterIDAsIntegerRegister(src);
					if(srcValue !== undefined){
						//srcは整数レジスタ
						//10	reg0	reg1	FF							CP(reg0, reg1);
						this.bin.push(0x10, destValue, srcValue, 0xff);
					} else{
						throw new ELCHNOSCompiler_CompileException(5, ["Expression:createBinary_substitute:Type error."], this.lineCount);
					}
				}
			} else{
				throw new ELCHNOSCompiler_CompileException(5, ["Expression:createBinary_substitute:Type error."], this.lineCount);
			}
		}
		this.dataStack.push(dest);
	},
	createBinary_TernaryIntegerOperation: function(src0, src1, opcode){
		//destは自動的に割り当てる
		var destValue;
		var src0Value;
		var src1Value;
		
		//まず引数がそれぞれ即値か確認する
		src0Value = this.getImmediateData(src0);
		src1Value = this.getImmediateData(src1);
		if(src0Value !== undefined && src1Value !== undefined){
			//両方とも即値だったので計算しておしまい
			switch(opcode){
				case 0x14:
					destValue = src0Value + src1Value;
					break;
				default:
					throw new ELCHNOSCompiler_CompileException(5, ["Expression:createBinary_TernaryIntegerOperation:Not implemented opcode.", opcode], this.lineCount);
			}
			this.dataStack.push(destValue);
			return;
		}
		//即値だったものをR3F展開（どちらかのみ実行される）
		//もしくはレジスタ番号を取得
		if(src0Value !== undefined){
			this.appendInstruction_LIMM3F(src0Value);
			src0Value = 0x3f;
		} else{
			src0Value = this.getRegisterIDAsIntegerRegister(src0);
			if(src0Value === undefined){
				throw new ELCHNOSCompiler_CompileException(5, ["Expression:createBinary_substitute:Type error."], this.lineCount);
			}
		}
		if(src1Value !== undefined){
			this.appendInstruction_LIMM3F(src1Value);
			src1Value = 0x3f;
		} else{
			src1Value = this.getRegisterIDAsIntegerRegister(src1);
			if(src1Value === undefined){
				throw new ELCHNOSCompiler_CompileException(5, ["Expression:createBinary_substitute:Type error."], this.lineCount);
			}
		}
		//格納先のレジスタをひとつもらう
		destValue = this.compiler.allocateIntegerRegister(this);
		this.tmpRegs.push(destValue);
		//この関数内ではdestは整数レジスタ番号だが、dataStackに積む時は文字列として、頭にrをつけるのを忘れないこと。
		//命令発行
		//reg0	reg1	reg2							CMPcc(reg0, reg1, reg2);
		this.bin.push(opcode, destValue, src0Value, src1Value);
		
		this.dataStack.push("r" + destValue.toString(16));
	},
	createBinary_readPointer: function(src0){
		//destは自動的に割り当てる
		var destValue;
		var src0Value;
		
		destValue = this.compiler.allocateIntegerRegister(this);
		this.tmpRegs.push(destValue);
		//この関数内ではdestValueは整数レジスタ番号だが、dataStackに積む時は文字列として、頭にrをつけるのを忘れないこと。

		src0Value = this.getRegisterIDAsPointerRegister(src0);
		if(src0Value !== undefined){
			//src0はポインタレジスタ
			//08	reg0R	typ32	reg1P	00			LMEM(reg0R, typ32, reg1P, 0);
			this.bin.push(0x08, destValue);
			this.appendInstruction_UINT32BE(src0.pointerType);
			this.bin.push(src0Value, 0x00);
		} else{
			throw new ELCHNOSCompiler_CompileException(5, ["Expression:createBinary_readPointer:Type error."], this.lineCount);
		}
		this.dataStack.push("r" + destValue.toString(16));
	},
	createBinary_increment: function(dest){
		var destValue;
		
		destValue = this.getRegisterIDAsPointerRegister(dest);
		if(destValue !== undefined){
			//destはポインタレジスタ
			//即値加算
			this.appendInstruction_LIMM3F(0x01);
			//0E	reg0P	typ32	reg1P	reg2R			PADD(reg0P, typ32, reg1P, reg2R);
			this.bin.push(0x0e, destValue);
			this.appendInstruction_UINT32BE(dest.pointerType);
			this.bin.push(destValue);
			this.bin.push(0x3f);
		} else{
			destValue = this.getRegisterIDAsIntegerRegister(dest);
			if(destValue !== undefined){
				//即値加算
				this.appendInstruction_LIMM3F(0x01);
				//14	reg0	reg1	reg2							ADD(reg0, reg1, reg2);	reg0 = (reg1 + reg2);
				this.bin.push(0x14, destValue, destValue, 0x3f);
			} else{
				throw new ELCHNOSCompiler_CompileException(5, ["Expression:createBinary_increment:Type error."], this.lineCount);
			}
		}
		this.dataStack.push(dest);
	},
	getRegisterIDAsIntegerRegister: function(o){
		//戻り値は整数レジスタ番号（数値）
		//整数レジスタでない場合はundefinedを返す。
		if(o instanceof ELCHNOSCompiler_ExpressionStructure_Variable && !o.isPointer && o.labelID == 0){
			return o.registerID;
		}
		if((typeof o == "string") && o.toLowerCase().indexOf("r") == 0){
			return parseInt(o.substring(1), 16);
		}
		return undefined;
	},
	getLabelID: function(o){
		//戻り値はラベル番号（数値）
		//ラベル番号でない場合はundefinedを返す。
		if(o instanceof ELCHNOSCompiler_ExpressionStructure_Variable && !o.isPointer && o.labelID != 0){
			return o.labelID;
		}
		return undefined;
	},
	getRegisterIDAsPointerRegister: function(o){
		//戻り値はポインタレジスタ番号（数値）
		//ポインタレジスタでない場合はundefinedを返す。
		if(o instanceof ELCHNOSCompiler_ExpressionStructure_Variable && o.isPointer && o.labelID == 0){
			return o.registerID;
		}
		if((typeof o == "string") && o.toLowerCase().indexOf("p") == 0){
			return parseInt(o.substring(1), 16);
		}
		return undefined;
	},
	getImmediateData: function(o){
		//戻り値は即値（数値）
		//即値でない場合はundefinedを返す。
		if(!isNaN(o)){
			return parseInt(o);
		}
		if(o instanceof ELCHNOSCompiler_ExpressionStructure_Variable && o.isImmediateData){
			return o.initValue[0];
		}
		return undefined;
	},
});

var ELCHNOSCompiler_ExpressionStructure_OSECPUBinary = function(compiler, lineCount){
	ELCHNOSCompiler_ExpressionStructure_OSECPUBinary.base.apply(this, arguments);
	this.isCompiled = false;
}.extend(ELCHNOSCompiler_ExpressionStructure, {
	createBinary: function(){
		if(!this.isCompiled){
			throw new ELCHNOSCompiler_CompileException(5, ["OSECPUBinary:createBinary:Not compiled."], this.lineCount);
		}
		return this.bin;
	},
});
