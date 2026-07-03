pragma circom 2.0.0;

template EligibilityCheck() {
    signal input risk_score; // 0-100
    signal input threshold;  // 60
    
    signal output is_eligible;

    // We can just do risk_score >= threshold, but since circom uses prime fields,
    // we use a comparator from circomlib or manually write it.
    // To keep it simple and dependency free for hackathon:
    // We assume risk_score and threshold are in [0, 100].
    // Difference is risk_score - threshold + 100.
    // If risk_score >= threshold, then risk_score - threshold >= 0
    // Actually we can use a small Num2Bits component.

    component n2b = Num2Bits(8);
    // 256 is enough for risk_score (0-100)
    n2b.in <== risk_score - threshold + 128;
    
    // If risk_score >= threshold, risk_score - threshold >= 0 => + 128 >= 128
    // So the 8th bit (index 7) will be 1.
    // Example: risk = 60, threshold = 60 => 60 - 60 + 128 = 128 => bit 7 is 1.
    // risk = 59, threshold = 60 => 59 - 60 + 128 = 127 => bit 7 is 0.
    
    is_eligible <== n2b.out[7];
}

template Num2Bits(n) {
    signal input in;
    signal output out[n];
    var lc1=0;
    var e2=1;
    for (var i = 0; i < n; i++) {
        out[i] <-- (in >> i) & 1;
        out[i] * (out[i] - 1) === 0;
        lc1 += out[i] * e2;
        e2 = e2 + e2;
    }
    lc1 === in;
}

component main {public [threshold]} = EligibilityCheck();
