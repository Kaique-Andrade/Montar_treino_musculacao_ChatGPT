import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { PutCommand, DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";


const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);
const TABLE_NAME = 'ChatGPTRequestLogs';

export const handler = async (event, context) => {
    try {
      const prompt = event.payload || "Bom dia!";
      const method = event.method;
      const apiKey = process.env.GOOGLE_API_KEY;
      const id = context.awsRequestId;
      
      if (!apiKey) {
        throw new Error("GOOGLE_API_KEY não definida nas variáveis de ambiente.");
      }
  
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
        method: method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          "contents" : [
            {
              "role" : "user",
              "parts" : [{"text" : "Você é um personal trainer experiente que deve desenvolver um treino de musculação personalizado de acordo com as informações fornecidas pelos clientes."}]
            },
            {
              "role" : "user",
              "parts" : [{"text" : typeof prompt === 'string' ? prompt : JSON.stringify(prompt)}]
            }
          ]
        }),
      });
  
      if (!response.ok) {
        throw new Error(`Erro na requisição: ${response.status}, ${await response.text()}`);
      }
  
      const data = await response.json();
      console.log(data);

      const completion = data.candidates[0].content.parts[0].text;
      
      console.log("Resposta do GEMINI:", completion);

      //Armazena o log no DynamoDB
      const logItem = {
        requestId: id,
        prompt: prompt,
        completion: completion,
        timestamp: new Date().toISOString(),
      };

      await docClient.send(
        new PutCommand({
          TableName: TABLE_NAME,
          Item: logItem,
        })
      );
  
      return {
        statusCode: 200,
        body: JSON.stringify({ completion: completion }),
      };
    } catch (error) {
      console.error("Erro ao processar a requisição:", error);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: error.message }),
      };
    }
  };
  