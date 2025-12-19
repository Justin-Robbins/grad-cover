const express = require('express');
const { google } = require('googleapis');
const app = express();

app.use(express.json());

const CLIENT_EMAIL = process.env.CLIENT_EMAIL;
const PRIVATE_KEY = process.env.PRIVATE_KEY?.replace(/\\n/g, '\n');

function getChatClient() {
  const auth = new google.auth.JWT(
    CLIENT_EMAIL,
    null,
    PRIVATE_KEY,
    ['https://www.googleapis.com/auth/chat.bot']
  );
  return google.chat({ version: 'v1', auth });
}

app.post('/', (req, res) => {
  const event = req.body;

  if (event.type === 'CARD_CLICKED') {
    const action = event.action?.actionMethodName;
    
    if (action === 'confirm') {
      return res.json({ text: '✅ You clicked Confirm!' });
    } else if (action === 'deny') {
      return res.json({ text: '❌ You clicked Deny!' });
    }
  }

  return res.json({
    text: 'Choose an option:',
    cardsV2: [{
      cardId: 'simpleCard',
      card: {
        header: { title: 'Simple Test Card' },
        sections: [{
          widgets: [{
            buttonList: {
              buttons: [
                {
                  text: 'Confirm',
                  onClick: { action: { actionMethodName: 'confirm' } }
                },
                {
                  text: 'Deny',
                  onClick: { action: { actionMethodName: 'deny' } }
                }
              ]
            }
          }]
        }]
      }
    }]
  });
});

app.post('/send-messages', async (req, res) => {
  const { emails } = req.body;

  if (!emails || !Array.isArray(emails)) {
    return res.status(400).json({ error: 'emails array required' });
  }

  try {
    const chat = getChatClient();
    const results = [];

    for (const email of emails) {
      try {
        const response = await chat.spaces.messages.create({
          parent: 'spaces/' + email.replace('@', '-').replace(/\./g, '-'),
          requestBody: {
            text: 'Choose an option:',
            cardsV2: [{
              cardId: 'simpleCard',
              card: {
                header: { title: 'Simple Test Card' },
                sections: [{
                  widgets: [{
                    buttonList: {
                      buttons: [
                        { text: 'Confirm', onClick: { action: { actionMethodName: 'confirm' } } },
                        { text: 'Deny', onClick: { action: { actionMethodName: 'deny' } } }
                      ]
                    }
                  }]
                }]
              }
            }]
          }
        });
        results.push({ email, success: true });
      } catch (error) {
        results.push({ email, success: false, error: error.message });
      }
    }

    res.json({ results });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});