import { getInput } from '../../inputUtils';

const VENDORS = ['openai', 'anthropic', 'google'] as const;

type Vendor = (typeof VENDORS)[number];
type ModelString = `${Vendor}/${string}`;

type TranslationOptions = {
  modelString: ModelString;
  apiKey: string;
  targetLang: string;
  systemPrompt?: string;
  maxToken: number;
};

const MODEL_STRING_ENV_NAME = 'AI_TRANSLATION_MODEL';
const API_KEY_ENV_NAME = 'AI_TRANSLATION_API_KEY';
const TARGET_LANG_ENV_NAME = 'AI_TRANSLATION_LANG';
const SYSTEM_PROMPT_ENV_NAME = 'AI_TRANSLATION_SYSTEM_PROMPT';
const MAX_TOKEN_ENV_NAME = 'AI_TRANSLATION_MAX_TOKEN';

const DEFAULT_MAX_TOKEN = '4000';

export const getTranslationOptions = (): TranslationOptions => {
  const modelString = getInput(MODEL_STRING_ENV_NAME);
  const apiKey = getInput(API_KEY_ENV_NAME);
  const targetLang = getInput(TARGET_LANG_ENV_NAME);
  const systemPrompt = getInput(SYSTEM_PROMPT_ENV_NAME);
  const maxToken = parseInt(getInput(MAX_TOKEN_ENV_NAME, DEFAULT_MAX_TOKEN));

  if (!modelString || !apiKey || !targetLang) {
    const errorBody = `${MODEL_STRING_ENV_NAME}, ${API_KEY_ENV_NAME}, and ${TARGET_LANG_ENV_NAME} are required`;
    throw new Error(errorBody);
  }

  if (!isValidModelString(modelString)) {
    // TODO: 무엇을 지원하고 어떻게 값 입력해야하는지 readme에 명시하고 이를 error에 포함시키자
    throw new Error(`Invalid ${MODEL_STRING_ENV_NAME}`);
  }

  return {
    modelString,
    apiKey,
    maxToken,
    targetLang,
    systemPrompt,
  };
};

const isValidModelString = (value: string): value is ModelString => {
  const vendor = value.split('/')[0] as Vendor;
  return vendor.length > 0 && VENDORS.includes(vendor);
};
