curl --request POST \
  --url http://localhost:3000/create-audit-log \
  --header 'Content-Type: application/json' \
  --data '{
	"parameters": ["berendetst", "saidjsad", 7113, 4]
}'