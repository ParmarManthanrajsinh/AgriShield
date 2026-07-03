param()

$ErrorActionPreference = "Stop"

# Paths
$CircomExe = "..\circom.exe"
$CircuitFile = "eligibility.circom"

Write-Host "Compiling circuit..."
& $CircomExe $CircuitFile --r1cs --wasm --sym

Write-Host "Generating Powers of Tau file (ptau)..."
if (-Not (Test-Path "pot12_final.ptau")) {
    snarkjs powersoftau new bn128 12 pot12_0000.ptau -v
    snarkjs powersoftau contribute pot12_0000.ptau pot12_0001.ptau --name="First" -v -e="random text"
    snarkjs powersoftau prepare phase2 pot12_0001.ptau pot12_final.ptau -v
}

Write-Host "Running groth16 setup..."
snarkjs groth16 setup eligibility.r1cs pot12_final.ptau eligibility_0000.zkey

Write-Host "Contributing to the phase 2 ceremony..."
# simulate a contribution
snarkjs zkey contribute eligibility_0000.zkey eligibility_final.zkey --name="CropGuard Admin" -v -e="random text"

Write-Host "Exporting verification key..."
snarkjs zkey export verificationkey eligibility_final.zkey verification_key.json

Write-Host "Setup Complete."
