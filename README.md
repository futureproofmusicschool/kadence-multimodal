# Multimodal Live API - Web console

This repository contains a react-based starter app for using the [Multimodal Live API](<[https://ai.google.dev/gemini-api](https://ai.google.dev/api/multimodal-live)>) over a websocket. It provides modules for streaming audio playback, recording user media such as from a microphone, webcam or screen capture as well as a unified log view to aid in development of your application.

[![Multimodal Live API Demo](readme/thumbnail.png)](https://www.youtube.com/watch?v=J_q7JY1XxFE)

Watch the demo of the Multimodal Live API [here](https://www.youtube.com/watch?v=J_q7JY1XxFE).

## Usage

To get started:

1. [Create a free Gemini API key](https://aistudio.google.com/apikey) and add it to the `.env` file as `REACT_APP_GEMINI_API_KEY`.

2. [Create a Google Cloud project](https://console.cloud.google.com/) and enable the Google Sheets API:
   - Go to API & Services > Library
   - Search for "Google Sheets API" and enable it
   - Create an API key under API & Services > Credentials
   - Add the API key to the `.env` file as `REACT_APP_GOOGLE_SHEETS_API_KEY`

3. Set up your Google Sheet:
   - Make sure your sheet has a header row
   - Column B should contain usernames that match the ones passed via URL parameter
   - Make the sheet publicly accessible (or Share > Anyone with the link can view)

4. Run the application:
```
$ npm install && npm start
```

We have provided several example applications on other branches of this repository:

- [demos/GenExplainer](https://github.com/google-gemini/multimodal-live-api-web-console/tree/demos/genexplainer)
- [demos/GenWeather](https://github.com/google-gemini/multimodal-live-api-web-console/tree/demos/genweather)
- [demos/GenList](https://github.com/google-gemini/multimodal-live-api-web-console/tree/demos/genlist)

## Example

Below is an example of an entire application that will use Google Search grounding and then render graphs using [vega-embed](https://github.com/vega/vega-embed):

```typescript
import { type FunctionDeclaration, SchemaType } from "@google/generative-ai";
import { useEffect, useRef, useState, memo } from "react";
import vegaEmbed from "vega-embed";
import { useLiveAPIContext } from "../../contexts/LiveAPIContext";

export const declaration: FunctionDeclaration = {
  name: "render_altair",
  description: "Displays an altair graph in json format.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      json_graph: {
        type: SchemaType.STRING,
        description:
          "JSON STRING representation of the graph to render. Must be a string, not a json object",
      },
    },
    required: ["json_graph"],
  },
};

export function Altair() {
  const [jsonString, setJSONString] = useState<string>("");
  const { client, setConfig } = useLiveAPIContext();

  useEffect(() => {
    setConfig({
      model: "models/gemini-2.0-flash-exp",
      systemInstruction: {
        parts: [
          {
            text: 'You are my helpful assistant. Any time I ask you for a graph call the "render_altair" function I have provided you. Dont ask for additional information just make your best judgement.',
          },
        ],
      },
      tools: [{ googleSearch: {} }, { functionDeclarations: [declaration] }],
    });
  }, [setConfig]);

  useEffect(() => {
    const onToolCall = (toolCall: ToolCall) => {
      console.log(`got toolcall`, toolCall);
      const fc = toolCall.functionCalls.find(
        (fc) => fc.name === declaration.name
      );
      if (fc) {
        const str = (fc.args as any).json_graph;
        setJSONString(str);
      }
    };
    client.on("toolcall", onToolCall);
    return () => {
      client.off("toolcall", onToolCall);
    };
  }, [client]);

  const embedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (embedRef.current && jsonString) {
      vegaEmbed(embedRef.current, JSON.parse(jsonString));
    }
  }, [embedRef, jsonString]);
  return <div className="vega-embed" ref={embedRef} />;
}
```

## development

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).
Project consists of:

- an Event-emitting websocket-client to ease communication between the websocket and the front-end
- communication layer for processing audio in and out
- a boilerplate view for starting to build your apps and view logs

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

The page will reload if you make edits.\
You will also see any lint errors in the console.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

## User Data Integration

This application fetches user data from a Google Sheet to personalize the AI conversations in a secure manner:

1. A username is passed via URL parameter (`?username=johnsmith`)
2. The client makes a secure request to a server-side API endpoint (`/api/user-data`)
3. The server-side API securely authenticates with Google Sheets using service account credentials
4. The API looks up the username in column B of the configured Google Sheet
5. The user's data is returned to the client and included in the AI's system prompt
6. This allows Kadence to provide personalized responses based on user profile data

### Security Features

- API keys and credentials remain on the server, never exposed to clients
- Google Sheet access is managed through a secure service account with limited permissions
- Authentication happens server-side through Google's secure OAuth flow
- Environment variables for credentials are securely stored in Vercel
- The API endpoint uses proper error handling to avoid leaking sensitive information

### Setting Up Google Sheets Integration

1. Create a Google Cloud project and enable the Google Sheets API
2. Create a service account with "Sheets API Reader" role
3. Generate and download service account credentials (JSON)
4. Share your Google Sheet with the service account email (read-only)
5. Set up Vercel environment variables:
   - `GOOGLE_SERVICE_ACCOUNT_KEY`: The entire JSON content of your service account credentials
   - Or alternatively `GOOGLE_SHEETS_API_KEY`: A Google Cloud API key (less secure option)

_This is an experiment showcasing the Multimodal Live API, not an official Google product. We'll do our best to support and maintain this experiment but your mileage may vary. We encourage open sourcing projects as a way of learning from each other. Please respect our and other creators' rights, including copyright and trademark rights when present, when sharing these works and creating derivative work. If you want more info on Google's policy, you can find that [here](https://developers.google.com/terms/site-policies)._
