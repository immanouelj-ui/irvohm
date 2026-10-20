# Run the cross-platform validator and propagate its exit status.
$validator = Join-Path $PSScriptRoot 'verify_seo.py'
python $validator
exit $LASTEXITCODE
