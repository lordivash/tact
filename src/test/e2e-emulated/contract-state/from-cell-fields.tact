//
// Test.fromCell(self.toCell()) = self
//

message NewContractData {
    cell: Cell;
}

contract Test {
    x: Int as uint32 = 0;
    y: Int as uint32 = 1;

    receive() { }

    receive(msg: NewContractData) {
        let c = Test.fromCell(msg.cell);
        self.x = c.x;
        self.y = c.y;
    }

    get fun state(): Test {
        return self;
    }
    get fun inverseLaw(): Bool {
        return (Test.fromCell(self.toCell())).toCell() == self.toCell();
    }
}


