const sourceNameLabels: Record<string, string> = {
  arxiv: 'arXiv 论文',
  github_trending: 'GitHub 热门',
  github: 'GitHub 热门',
  zhihu: '知乎',
  huawei_ascend: '昇腾社区',
  '机器之心': '机器之心',
  '量子位': '量子位',
  'HuggingFace Blog': 'HuggingFace 博客',
  'Papers with Code': 'Papers with Code',
  '掘金 AI': '掘金',
  'OpenAI Blog': 'OpenAI 博客',
  'DeepSeek': 'DeepSeek',
  'AI前线': 'AI前线',
  '新智元': '新智元',
};

const sourceTypeLabels: Record<string, string> = {
  crawler: '爬虫',
  rss: 'RSS',
  arxiv: 'arXiv 论文',
  github_trending: 'GitHub 热门',
  github: 'GitHub 热门',
  zhihu: '知乎',
  huawei_ascend: '昇腾社区',
};

export function formatSourceName(sourceName?: string | null): string {
  if (!sourceName) return '未知来源';
  return sourceNameLabels[sourceName] || sourceName;
}

export function formatSourceType(sourceType?: string | null): string {
  if (!sourceType) return '未知';
  return sourceTypeLabels[sourceType] || sourceType;
}
