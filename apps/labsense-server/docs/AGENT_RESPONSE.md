```json
{
  "totalSeconds": 3600,
  "activeSeconds": 3200,
  "idleSeconds": 400,
  "applications": [
    {
      "appName": "VS Code",
      "totalSeconds": 1800,
      "activeSeconds": 1700,
      "idleSeconds": 100,
      "segments": [
        {
          "startedAt": "2026-05-16T10:00:00Z",
          "endedAt": "2026-05-16T10:15:00Z"
        },
        {
          "startedAt": "2026-05-16T10:45:00Z",
          "endedAt": "2026-05-16T11:00:00Z"
        }
      ],
      "details": [
        {
          "title": "main.rs - labsense-agent",
          "totalSeconds": 1800,
          "activeSeconds": 1700,
          "idleSeconds": 100,
          "segments": [
            {
              "startedAt": "2026-05-16T10:00:00Z",
              "endedAt": "2026-05-16T10:15:00Z"
            },
            {
              "startedAt": "2026-05-16T10:45:00Z",
              "endedAt": "2026-05-16T11:00:00Z"
            }
          ]
        }
      ]
    },
    {
      "appName": "ChatGPT",
      "totalSeconds": 1200,
      "activeSeconds": 1000,
      "idleSeconds": 200,
      "segments": [
        {
          "startedAt": "2026-05-16T10:15:00Z",
          "endedAt": "2026-05-16T10:35:00Z"
        }
      ],
      "details": [
        {
          "title": "Rust Segment Tracking Logic",
          "url": "https://chatgpt.com/c/12345-abcde",
          "domain": "chatgpt.com",
          "totalSeconds": 800,
          "activeSeconds": 700,
          "idleSeconds": 100,
          "segments": [
            {
              "startedAt": "2026-05-16T10:15:00Z",
              "endedAt": "2026-05-16T10:28:20Z"
            }
          ]
        },
        {
          "title": "Fixing Chrono Timezones",
          "url": "https://chatgpt.com/c/67890-vwxyz",
          "domain": "chatgpt.com",
          "totalSeconds": 400,
          "activeSeconds": 300,
          "idleSeconds": 100,
          "segments": [
            {
              "startedAt": "2026-05-16T10:28:20Z",
              "endedAt": "2026-05-16T10:35:00Z"
            }
          ]
        }
      ]
    },
    {
      "appName": "Google Colab",
      "totalSeconds": 600,
      "activeSeconds": 500,
      "idleSeconds": 100,
      "segments": [
        {
          "startedAt": "2026-05-16T10:35:00Z",
          "endedAt": "2026-05-16T10:45:00Z"
        }
      ],
      "details": [
        {
          "title": "Machine_Learning_Project.ipynb",
          "url": "https://colab.research.google.com/drive/abc123xyz",
          "domain": "colab.research.google.com",
          "totalSeconds": 600,
          "activeSeconds": 500,
          "idleSeconds": 100,
          "segments": [
            {
              "startedAt": "2026-05-16T10:35:00Z",
              "endedAt": "2026-05-16T10:45:00Z"
            }
          ]
        }
      ]
    }
  ]
}
```