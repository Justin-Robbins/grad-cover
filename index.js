const express = require('express');
const app = express();

app.use(express.json());

const ABOUT_COMMAND_ID = 1;
const HELP_COMMAND_ID = 2;

app.post('/', (req, res) => {
  const event = req.body;

  if (event.appCommandMetadata) {
    return res.json(handleAppCommands(event));
  } else {
    return res.json(handleRegularMessage(event));
  }
});

function handleAppCommands(event) {
  const {appCommandId} = event.appCommandMetadata;

  if (appCommandId === ABOUT_COMMAND_ID || appCommandId === HELP_COMMAND_ID) {
    return {
      privateMessageViewer: event.user,
      text: 'The Avatar app replies to Google Chat messages.'
    };
  }
}

function handleRegularMessage(event) {
  return createMessage(event.user);
}

function createMessage({displayName, avatarUrl}) {
  return {
    text: "Here's your avatar",
    cardsV2: [{
      cardId: 'avatarCard',
      card: {
        name: 'Avatar Card',
        header: {
          title: `Hello ${displayName}!`,
        },
        sections: [{
          widgets: [
            {textParagraph: {text: 'Your avatar picture:'}},
            {image: {imageUrl: avatarUrl}},
          ],
        }],
      },
    }],
  };
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});