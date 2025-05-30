Module =
    imports:Import*
    items:moduleItem*;

Import =
    keyword<"import">
    path:StringLiteral
    ";";

moduleItem
    = PrimitiveTypeDecl
    / Function
    / AsmFunction
    / NativeFunctionDecl
    / Constant
    / StructDecl
    / MessageDecl
    / Contract
    / Trait;

contractItemDecl
    = ContractInit
    / Receiver
    / Function
    / AsmFunction
    / Constant
    / storageVar;

traitItemDecl
    = Receiver
    / Function
    / AsmFunction
    / Constant
    / storageVar;

PrimitiveTypeDecl =
    keyword<"primitive">
    name:TypeId
    ";";

Function =
    attributes:FunctionAttribute*
    keyword<"fun">
    name:Id
    parameters:ParameterList<Parameter>
    returnType:ascription?
    body:(FunctionDefinition / FunctionDeclaration);

FunctionDefinition = body:statements;

FunctionDeclaration = semicolon;

AsmFunction =
    "asm"
    shuffle:shuffle?
    attributes:FunctionAttribute*
    keyword<"fun">
    name:Id
    parameters:ParameterList<Parameter>
    returnType:ascription?
    "{"
    instructions:assembly
    "}";

shuffle = "(" ids:Id* to:("->" @IntegerLiteralDec+)? ")";

NativeFunctionDecl =
    "@name" "("
    nativeName:#FuncId
    ")"
    attributes:FunctionAttribute*
    keyword<"native">
    name:Id
    parameters:ParameterList<Parameter>
    returnType:ascription?
    ";";

Constant =
    attributes:ConstantAttribute*
    keyword<"const">
    name:Id
    type:ascription
    body:(ConstantDefinition / ConstantDeclaration);

ConstantAttribute = name:(
    keyword<"virtual">
    / keyword<"override">
    / keyword<"abstract">
);

ConstantDefinition = "=" expression:expression semicolon;

ConstantDeclaration = semicolon;

storageVar = @FieldDecl semicolon;

StructDecl =
    "struct"
    name:TypeId
    "{"
    fields:structFields
    "}";

MessageDecl =
    "message"
    opcode:("(" @expression ")")?
    name:TypeId
    "{"
    fields:structFields
    "}";

structFields = @inter<FieldDecl, ";">? ";"?;

FieldDecl =
    name:Id
    type:ascription
    expression:("=" @expression)?;

Contract =
    attributes:ContractAttribute*
    keyword<"contract">
    name:Id
    parameters:ParameterList<Parameter>?
    traits:inheritedTraits?
    "{"
    declarations:contractItemDecl*
    "}";

Trait =
    attributes:ContractAttribute*
    keyword<"trait">
    name:Id
    traits:inheritedTraits?
    "{"
    declarations:traitItemDecl*
    "}";

inheritedTraits = keyword<"with"> @commaList<Id>;

ContractInit =
    "init"
    parameters:ParameterList<Parameter>
    body:statements;

ContractAttribute = "@interface" "(" name:StringLiteral ")";

// 'get' cannot be a reserved word because there is the map '.get' method
FunctionAttribute = name:(
    GetAttribute
    / keyword<"mutates">
    / keyword<"extends">
    / keyword<"virtual">
    / keyword<"override">
    / keyword<"inline">
    / keyword<"abstract">
);

GetAttribute = "get" methodId:("(" @expression ")")?;

Receiver = type:ReceiverType "(" param:receiverParam ")" body:statements;
// "bounced" cannot be a reserved word because there a 'bounced' field in stdlib's 'Context' structure
ReceiverType = name:("bounced" / keyword<"receive"> / keyword<"external">);
receiverParam = @(Parameter / StringLiteral)?;

assembly = #$assemblySequence;
assemblySequence = assemblyItem*;
assemblyItem
    = "{" assemblySequence "}"
    / Comment
    / "\"" [^"]* "\""
    / (!(["{}] / "//" / "/*") .)+;

ascription = ":" @type;

type = TypeAs;
TypeAs = type:TypeOptional as:(keyword<"as"> @Id)*;
TypeOptional = type:typePrimary optionals:"?"*;

typePrimary = TypeGeneric / TypeRegular;
TypeRegular = child:TypeId;
TypeGeneric = name:(MapKeyword / Bounced / TypeId) "<" args:commaList<type> ">";
MapKeyword = keyword<"map">;
Bounced = "bounced";

TypeId "capitalized identifier" = name:#$([A-Z] [a-zA-Z0-9_]*);

typeArgs = generic<type>;
generic<T> = "<" @commaList<T>? ">";

statement
    = StatementLet
    / StatementDestruct
    / StatementBlock
    / StatementReturn
    / StatementCondition
    / StatementWhile
    / StatementRepeat
    / StatementUntil
    / StatementTry
    / StatementForEach
    / StatementExpression
    / StatementAssign;

statements = "{" @statement* "}";

StatementLet        = keyword<"let"> name:Id type:ascription? "=" init:expression semicolon;
StatementDestruct   = keyword<"let"> type:TypeId "{" fields:inter<destructItem, ","> rest:optionalRest "}" "=" init:expression semicolon;
StatementBlock      = body:statements;
StatementReturn     = keyword<"return"> expression:expression? semicolon;
StatementExpression = expression:expression semicolon;
StatementAssign     = left:expression operator:(augmentedOp / "=") right:expression semicolon;
StatementCondition  = keyword<"if"> condition:expression trueBranch:statements falseBranch:(keyword<"else"> @(FalseBranch / StatementCondition))?;
StatementWhile      = keyword<"while"> condition:parens body:statements;
StatementRepeat     = keyword<"repeat"> condition:parens body:statements;
StatementUntil      = keyword<"do"> body:statements keyword<"until"> condition:parens semicolon;
StatementTry        = keyword<"try"> body:statements handler:(keyword<"catch"> "(" name:Id ")" body:statements)?;
StatementForEach    = keyword<"foreach"> "(" key:Id "," value:Id "in" expression:expression ")" body:statements;

augmentedOp = "||=" / "&&=" / ">>=" / "<<=" / "-=" / "+=" / "*=" / "/=" / "%=" / "|=" / "&=" / "^=";
FalseBranch = body:statements;
semicolon = ";" / &"}";

destructItem = RegularField / PunnedField;
RegularField = fieldName:Id ":" varName:Id;
PunnedField = name:Id;

optionalRest = "," @RestArgument / NoRestArgument;
RestArgument = "..";
NoRestArgument = ","?;

expression   = Conditional;

Conditional  = head:or tail:("?" thenBranch:or ":" elseBranch:Conditional)?;

or           = Binary<and,          "||">;
and          = Binary<bitwiseOr,    "&&">;
bitwiseOr    = Binary<bitwiseXor,   "|">;
bitwiseXor   = Binary<bitwiseAnd,   "^">;
bitwiseAnd   = Binary<equality,     "&">;
equality     = Binary<compare,      ("!=" / "==")>;
compare      = Binary<bitwiseShift, ("<=" / "<" / ">=" / ">")>;
bitwiseShift = Binary<add,          ("<<" / ">>")>;
add          = Binary<mul,          ("+" / "-")>;
mul          = Binary<Unary,        [*/%]>;

Unary        = prefixes:Operator<[-+!~]>* expression:Suffix;
Suffix       = expression:primary suffixes:suffix*;

Binary<T, U> = exprs:inter<T, Operator<U>>;
Operator<U>  = name:U;

suffix
    = SuffixUnboxNotNull
    / SuffixCall
    / SuffixFieldAccess;

SuffixUnboxNotNull = "!!";
SuffixCall = params:ParameterList<expression>;
SuffixFieldAccess = "." name:Id;

// Order is important
primary
    = Parens
    / MapLiteral
    / SetLiteral
    / StructInstance
    / IntegerLiteral
    / BoolLiteral
    / InitOf
    / CodeOf
    / Null
    / StringLiteral
    / Id;

Null = keyword<"null">;

parens = "(" @expression ")";
Parens = child:parens;

StructInstance = type:TypeId body:StructInstanceFields;
StructInstanceFields = "{" fields:commaList<StructFieldInitializer>? "}";

MapLiteral =
    keyword<"map">
    typeArgs:typeArgs
    "{"
    fields:commaList<mapField>?
    "}";
mapField = key:expression ":" value:expression;

SetLiteral =
    "set"
    typeArgs:typeArgs
    "{"
    fields:commaList<expression>?
    "}";

InitOf = keyword<"initOf"> name:Id params:ParameterList<expression>;
CodeOf = "codeOf" name:Id;

StructFieldInitializer = name:Id init:(":" @expression)?;

ParameterList<T> = "(" values:commaList<T>? ")";
Parameter = name:Id type:ascription;

commaList<T> = @inter<T, ","> ","?;

// order is important
IntegerLiteral = value:(IntegerLiteralHex / IntegerLiteralBin / IntegerLiteralOct / IntegerLiteralDec);

IntegerLiteralDec = digits:#underscored<digit>;
IntegerLiteralHex = digits:#("0" [xX] @underscored<hexDigit>);
IntegerLiteralBin = digits:#("0" [bB] @underscored<[01]>);
IntegerLiteralOct = digits:#("0" [oO] @underscored<[0-7]>);
underscored<T> = $(T ("_"? T)*);
digit "digit" = [0-9];

idPart "identifier character" = [a-zA-Z0-9_];
Id "identifier" = name:#$(!reservedWord [a-zA-Z_] idPart*);

// FunC identifiers, where `FuncId` stands for FunC function identifier
// A plain identifier cannot be a number, a single underscore, an operator, a keyword or a compiler directive
// See: https://github.com/ton-blockchain/ton/blob/master/crypto/func/keywords.cpp

FuncId "FunC identifier" = accessor:[.~]? id:$("`" [^`\r\n]+ "`" / [^ \t\r\n()[\],.;~]+);

// Boolean literals
BoolLiteral = value:("true" / "false") !idPart;

// String literals
StringLiteral = value:#("\"" @$([^"\\] / "\\" @escapeChar)* "\"");

escapeChar
    = [\\"nrtvbf]
    / "u{" @$(hexDigit hexDigit? hexDigit? hexDigit? hexDigit? hexDigit?) "}"
    / "u" @$(hexDigit hexDigit hexDigit hexDigit)
    / "x" @$(hexDigit hexDigit);

hexDigit "hexadecimal digit" = [0-9a-fA-F];

keyword<T> = #(@T !idPart);

// Order is important
reservedWord "reserved word" = keyword<(
    // extend and public are reserved for legacy reasons
    "extend" / "public" /

    "fun" / "let" / "return" / "receive" / "native" / "primitive" / "null" /
    "if" / "else" / "while" / "repeat" / "do" / "until" / "try" / "catch" /
    "foreach" / "as" / "map" / "mutates" / "extends" / "external" / "import" /
    "with" / "trait" / "initOf" / "override" / "abstract" / "virtual" /
    "inline" / "const"
)>;

space "space" = (#$([ \t\r\n]+) / Comment)+;
Comment = multiLineComment / singleLineComment;
multiLineComment = "/*" @$(!"*/" .)* "*/";
singleLineComment = "//" @$[^\r\n]*;

// This is not used in the Tact grammar but
// it is useful for imports resolution
JustImports = imports:Import* .*;

inter<A, B> = head:A tail:(op:B right:A)*;
