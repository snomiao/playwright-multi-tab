// Patches the extension manifest with the known public key so that
// the extension ID is always mmlmfjhmonkocbjadbfplnigmagldckm
// (same as the Chrome Web Store version)
const fs = require('fs');
const path = require('path');

const EXT_DIR = process.env.EXT_DIR || '/ext/dist';
const manifestPath = path.join(EXT_DIR, 'manifest.json');

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

// Public key matching extension ID: mmlmfjhmonkocbjadbfplnigmagldckm
manifest.key = 'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAwRsUUO4mmbCi4JpmrIoIw31iVW9+xUJRZ6nSzya17PQkaUPDxe1IpgM+vpd/xB6mJWlJSyE1Lj95c0sbomGfVY1M0zUeKbaRVcAb+/a6m59gNR+ubFlmTX0nK9/8fE2FpRB9D+4N5jyeIPQuASW/0oswI2/ijK7hH5NTRX8gWc/ROMSgUj7rKhTAgBrICt/NsStgDPsxRTPPJnhJ/ViJtM1P5KsSYswE987DPoFnpmkFpq8g1ae0eYbQfXy55ieaacC4QWyJPj3daU2kMfBQw7MXnnk0H/WDxouMOIHnd8MlQxpEMqAihj7KpuONH+MUhuj9HEQo4df6bSaIuQ0b4QIDAQAB';

fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
console.log('Extension manifest patched with public key, ID: mmlmfjhmonkocbjadbfplnigmagldckm');
