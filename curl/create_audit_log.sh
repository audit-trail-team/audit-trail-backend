curl --request POST \
  --url http://localhost:3000/create-audit-log \
  --header 'Content-Type: application/json' \
  --data '{
  "EvidenceUserID": "marvinator", 
  "PdfDocumentBase64": "mydocs", 
  "Customer": "marv", 
  "Timestamp": "2024-04-08 13:22:17", 
  "SigType": 3
}'