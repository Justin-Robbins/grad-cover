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
  
  console.log('Received event:', JSON.stringify(event, null, 2));

  // Handle button clicks - CHECK THE RIGHT FIELD
  if (event.type === 'CARD_CLICKED') {
    const action = event.common?.invokedFunction;
    
    console.log('Button clicked, action:', action);
    
    if (action === 'confirm') {
      return res.json({
        actionResponse: {
          type: 'UPDATE_MESSAGE'
        },
        text: '✅ You clicked Confirm!'
      });
    } else if (action === 'deny') {
      return res.json({
        actionResponse: {
          type: 'UPDATE_MESSAGE'
        },
        text: '❌ You clicked Deny!'
      });
    }
  }

  // Regular message
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
                  onClick: {
                    action: {
                      function: 'confirm'
                    }
                  }
                },
                {
                  text: 'Deny',
                  onClick: {
                    action: {
                      function: 'deny'
                    }
                  }
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
        // Find or create DM space
        const spacesResponse = await chat.spaces.list({
          filter: `spaceType = "DIRECT_MESSAGE"`
        });

        let spaceName = null;
        
        // Try to find existing DM with this user
        if (spacesResponse.data.spaces) {
          for (const space of spacesResponse.data.spaces) {
            const membersResponse = await chat.spaces.members.list({
              parent: space.name
            });
            
            const hasUser = membersResponse.data.memberships?.some(
              m => m.member?.name === `users/${email}`
            );
            
            if (hasUser) {
              spaceName = space.name;
              break;
            }
          }
        }

        // If no existing DM found, create one by having the bot message the user
        // This requires the user to have already interacted with the bot at least once
        if (!spaceName) {
          results.push({ 
            email, 
            success: false, 
            error: 'User must message the bot first before bot can DM them'
          });
          continue;
        }

        // Send message
        await chat.spaces.messages.create({
          parent: spaceName,
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
                        {
                          text: 'Confirm',
                          onClick: {
                            action: {
                              function: 'confirm'
                            }
                          }
                        },
                        {
                          text: 'Deny',
                          onClick: {
                            action: {
                              function: 'deny'
                            }
                          }
                        }
                      ]
                    }
                  }]
                }]
              }
            }]
          }
        });

        results.push({ email, success: true, space: spaceName });
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