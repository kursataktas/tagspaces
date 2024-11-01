/*
Copyright (c) 2023-present The TagSpaces GmbH. All rights reserved.
*/

import React, { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import FormHelperText from '@mui/material/FormHelperText';
import FormControl from '@mui/material/FormControl';
import { useTranslation } from 'react-i18next';
import AppConfig from '-/AppConfig';
import TsTextField from '-/components/TsTextField';
import {
  Timeline,
  TimelineConnector,
  TimelineContent,
  TimelineDot,
  TimelineItem,
  TimelineOppositeContent,
  TimelineSeparator,
} from '@mui/lab';
import { useNotificationContext } from '-/hooks/useNotificationContext';
import {
  Box,
  InputLabel,
  List,
  ListItem,
  MenuItem,
  Select,
} from '@mui/material';
import { useSelector } from 'react-redux';
import { getOllamaSettings } from '-/reducers/settings';
import { TS } from '-/tagspaces.namespace';
import InputAdornment from '@mui/material/InputAdornment';
import Tooltip from '-/components/Tooltip';
import IconButton from '@mui/material/IconButton';
import SendIcon from '@mui/icons-material/Send';
import { SelectChangeEvent } from '@mui/material/Select';
import { RemoveIcon } from '-/components/CommonIcons';
import { MilkdownEditor } from '@tagspaces/tagspaces-md';
import { format } from 'date-fns';

interface Props {
  onClose: (event?: object, reason?: string) => void;
}

type ChatItem = {
  request: string;
  response?: string;
  timestamp: number;
};

function MainContainer(props: Props) {
  const { t } = useTranslation();

  const { showNotification } = useNotificationContext();
  const chatMsg = useRef<string>(undefined);
  const currentModel = useRef<TS.Model>(undefined);
  const models = useRef<TS.Model[]>([]);
  const chatHistoryItems = useRef<ChatItem[]>([]);
  //const txtInputRef = useRef<HTMLInputElement>(null);
  const [ignored, forceUpdate] = useReducer((x) => x + 1, 0, undefined);

  const ollamaSettings = useSelector(getOllamaSettings);

  const ollamaAvailableModels: TS.Model[] = [
    {
      name: 'llama3.1',
      details: {
        format:
          '4,6 GB. The largest language model from Meta, featuring 405 billion parameters. It is one of the leading open-source AI models, capable of understanding and processing information deeply and diversely',
      },
    },
    {
      name: 'llama3.2',
      details: {
        format:
          'new 1B and 3B lightweight models are designed for seamless integration on mobile and edge devices. With these models, you can build private, personalized AI experiences with minimal latency and resource overhead.',
      },
    },
    {
      name: 'gemma2',
      details: {
        format:
          "5,4 GB. One of GEMMA2's standout features is its ability to handle and integrate multiple data modalities. Traditional AI models often specialise in a single type of data — text, images, or audio. GEMMA2, however, can process and synthesise information from all these sources simultaneously.",
      },
    },
    {
      name: 'codegemma',
      details: {
        format:
          'CodeGemma models are text-to-text and text-to-code decoder-only models and are available as a 7 billion pretrained variant that specializes in code completion and code generation tasks, a 7 billion parameter instruction-tuned variant for code chat and instruction following and a 2 billion parameter pretrained variant.',
      },
    },
    {
      name: 'llava',
      details: {
        format:
          'large multimodal model that is designed to understand and generate content based on both visual inputs (images) and textual instructions.',
      },
    },
  ];

  // const [inputError, setInputError] = useState<boolean>(false);
  const [isTyping, setTyping] = useState<boolean>(false);

  const chatMessageHandler = useMemo(() => {
    return (msg, replace): void => {
      //console.log(`Chat ${msg}`);
      setTyping(true);
      addTimeLineResponse(msg, replace);
    };
  }, []);

  useEffect(() => {
    refreshOllamaModels();
  }, []);

  useEffect(() => {
    if (AppConfig.isElectron) {
      window.electronIO.ipcRenderer.on('ChatMessage', (message, replace) => {
        console.log('ChatMessage:' + message);
        if (message instanceof Uint8Array) {
          chatMessageHandler(new TextDecoder('utf-8').decode(message), replace);
        } else if (typeof message === 'string') {
          chatMessageHandler(message, replace);
        }
      });

      return () => {
        window.electronIO.ipcRenderer.removeAllListeners('ChatMessage');
        if (currentModel.current) {
          //unload model
          newChatMessage(undefined, undefined, true);
        }
      };
    }
  }, [chatMessageHandler]);

  function refreshOllamaModels(modelName = undefined) {
    window.electronIO.ipcRenderer
      .invoke('getOllamaModels', ollamaSettings.url)
      .then((m) => {
        if (m && m.length > 0) {
          models.current = m;
          if (modelName) {
            const model = models.current.find((m) => m.name === modelName);
            if (model) {
              setModel(model);
            }
          } else {
            forceUpdate();
          }
        }
      });
  }

  function addTimeLineRequest(txt) {
    if (txt) {
      const newItem: ChatItem = {
        request: txt,
        timestamp: new Date().getTime(),
      };
      chatHistoryItems.current = [newItem, ...chatHistoryItems.current];
      forceUpdate();
    }
  }
  function addTimeLineResponse(txt, replace) {
    if (chatHistoryItems.current.length > 0) {
      const firstItem = chatHistoryItems.current[0];
      firstItem.response =
        (!replace && firstItem.response ? firstItem.response : '') + txt;
      forceUpdate();
    }
  }

  /**
   * @param msg If the messages array is empty, the model will be loaded into memory.
   * @param images (optional): a list of images to include in the message (for multimodal models such as llava)
   * @param unload If the messages array is empty and the keep_alive parameter is set to 0, a model will be unloaded from memory.
   */
  function newChatMessage(msg = undefined, images = undefined, unload = false) {
    if (currentModel.current === undefined) {
      showNotification(t('core:chooseModel'));
      return;
    }
    const messages =
      msg && !unload
        ? [
            {
              role: 'user',
              content: msg,
              ...(images && { images }),
            },
          ]
        : [];
    addTimeLineRequest(msg);
    window.electronIO.ipcRenderer
      .invoke('newOllamaMessage', ollamaSettings.url, {
        model: currentModel.current.name, // Adjust model name as needed
        messages,
        stream: true,
        ...(unload && { keep_alive: 0 }),
      })
      .then((response) => {
        console.log('newOllamaMessage response:' + response);
        chatMsg.current = '';
        /*if (txtInputRef.current) {
          txtInputRef.current.value = '';
        }*/
        setTyping(false);
      });
  }

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    chatMsg.current = event.target.value;
    forceUpdate();
  };

  function setModel(model) {
    if (currentModel.current !== model) {
      currentModel.current = model;
      //load model
      newChatMessage();
      forceUpdate();
    }
  }
  const handleRemoveModel = () => {
    if (currentModel.current) {
      const result = confirm(
        'Do you want to remove ' + currentModel.current.name + ' model?',
      );
      if (result) {
        addTimeLineRequest('deleting ' + currentModel.current.name);
        window.electronIO.ipcRenderer
          .invoke('deleteOllamaModel', ollamaSettings.url, {
            name: currentModel.current.name,
          })
          .then((response) => {
            console.log('deleteOllamaModel response:' + response);
            if (response) {
              currentModel.current = undefined;
              refreshOllamaModels();
            }
          });
      }
    }
  };

  const handleChangeModel = (event: SelectChangeEvent) => {
    const newModelName = event.target.value;
    const model = models.current.find((m) => m.name === newModelName);
    if (model) {
      setModel(model);
    } else {
      const result = confirm(
        'Do you want to download and install ' + newModelName + ' model?',
      );
      if (result) {
        addTimeLineRequest('downloading ' + newModelName);
        window.electronIO.ipcRenderer
          .invoke('pullOllamaModel', ollamaSettings.url, {
            name: newModelName,
            stream: true,
          })
          .then((response) => {
            console.log('pullOllamaModel response:' + response);
            refreshOllamaModels(newModelName);
          });
      }
    }
  };

  function formatChatItems(chatItems: ChatItem[]): string {
    const formattedItems = chatItems.map((item) => {
      const date = item.timestamp
        ? ' [' + format(item.timestamp, 'yyyy-MM-dd HH:mm') + ']'
        : '';
      return (
        '\n | `user' +
        date +
        ':` ' +
        item.request +
        ' |\n|-------------| \n\n ' +
        item.response +
        ' \n '
      );
    });
    return formattedItems.join(' ');
  }

  return (
    <>
      <FormControl variant="filled">
        <Box sx={{ width: '100%' }}>
          <InputLabel id="select-label">Select a model</InputLabel>
          <Select
            displayEmpty
            sx={{ minWidth: 400 }}
            labelId="select-label"
            id="select-menu"
            value={currentModel.current ? currentModel.current.name : 'init'}
            onChange={handleChangeModel}
            label="Select Model"
          >
            <MenuItem value="init" disabled>
              Choose an model
            </MenuItem>
            {models.current.length > 0 ? (
              models.current.map((model) => (
                <MenuItem
                  key={model.name}
                  value={model.name}
                  title={model.modified_at}
                >
                  {model.name}
                </MenuItem>
              ))
            ) : (
              <MenuItem value="" disabled>
                No models installed
              </MenuItem>
            )}
            <MenuItem value="" disabled>
              Available models
            </MenuItem>
            {ollamaAvailableModels.map((model) => (
              <MenuItem
                key={model.name}
                value={model.name}
                title={model.details.format}
              >
                {model.name}
              </MenuItem>
            ))}
          </Select>
          {currentModel.current && (
            <IconButton
              aria-label={t('core:deleteModel')}
              onClick={handleRemoveModel}
              data-tid="deleteModelTID"
              size="small"
            >
              <RemoveIcon />
            </IconButton>
          )}
        </Box>
      </FormControl>

      <FormControl fullWidth={true}>
        <TsTextField
          autoFocus
          disabled={isTyping}
          name="entryName"
          label={t('core:newChatMessage')}
          onChange={handleInputChange}
          value={chatMsg.current}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.code === 'Enter') {
              event.preventDefault();
              event.stopPropagation();
              newChatMessage(chatMsg.current);
            }
          }}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end" style={{ height: 32 }}>
                <Tooltip title="Send Message">
                  <IconButton
                    onClick={() => {
                      newChatMessage(chatMsg.current);
                    }}
                    size="large"
                  >
                    <SendIcon />
                  </IconButton>
                </Tooltip>
              </InputAdornment>
            ),
          }}
        />
        <FormHelperText>{t('core:aiHelp')}</FormHelperText>
      </FormControl>
      <MilkdownEditor
        content={formatChatItems(chatHistoryItems.current)}
        readOnly={true}
        lightMode={true}
      />
      {/*<Timeline>
        {chatHistoryItems.current.map((item) => (
          <TimelineItem key={item.request}>
            <TimelineOppositeContent color="text.secondary">
              {item.request}
            </TimelineOppositeContent>
            <TimelineSeparator>
              <TimelineDot />
              <TimelineConnector />
            </TimelineSeparator>
            <TimelineContent>{item.response}</TimelineContent>
          </TimelineItem>
        ))}
      </Timeline>*/}
    </>
  );
}

export default MainContainer;
