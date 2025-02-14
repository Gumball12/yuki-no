# Why Yuki-no

Technical docs translation plays a vital role in helping more people utilize technology and growing the open-source community. For various reasons including cost, scalability, flexibility, and data ownership, translation projects often build their own translation processes based on open-source rather than using commercial SaaS solutions, and there are various open-source solutions supporting this.

Among them, [Ryu-Cho](https://github.com/vuejs-translations/ryu-cho) (a fork of [Che-Tsumi](https://github.com/vuejs-jp/che-tsumi) project) is an open-source translation management solution based on GitHub Actions created by [Vue.js Translations](https://github.com/vuejs-translations). It provides powerful synchronization functionality that continuously monitors specific repos and creates GitHub Issues when commits occur. It's a reliable open-source tool used in Vite and Vue docs translation projects, making it easy to identify which parts need new translations.

Yuki-no (雪の, meaning "of snow" in Japanese) was built upon Ryu-Cho with several additional features and improvements deemed necessary for translation projects. Through this, Yuki-no aims to help build a more robust and powerful open-source translation process.

## The Problems

I am participating as a maintainer in the [Vite Korean docs translation project](https://github.com/vitejs/docs-ko). This project previously used Ryu-Cho but has now switched to Yuki-no.

This is because the features provided by Ryu-Cho were insufficient. Below are what I consider to be the _three essential features for technical docs translation projects_.

### Change Tracking

It should be possible to automatically track commits from the original docs. This is because manual tracking can be difficult when docs are frequently updated or contain a large amount of content.

Change tracking is particularly important as it directly affects the reliability of translated docs, making it more crucial than other features. For instance, if commits are missed, this can lead to problems such as failing to reflect changes or translating unnecessary parts.

<p align="center">

<img width="400" src="./docs/change-tracking-example.webp" title="Change Tracking Example" alt="Change Tracking Example">

_Example: Yuki-no automatically creates an issue for new commits in the head repository_

</p>

Ryu-Cho supports this feature well. It uses an approach of continuously monitoring specific repos and creating GitHub Issues for new commits. Yuki-no also uses this simple but powerful method, providing it based on Ryu-Cho's reliable code.

### Release Status Tracking

Checking when commits are released might not seem important. However, in most cases, users expect docs not to include pre-release or unreleased content. Therefore, if we process all new commits without distinguishing their release status, it can cause confusion for users reading the docs.

Ryu-Cho doesn't provide release info for commits. This means manual verification is needed to check if changes have been released before translation. If not properly checked, this can lead to the problem of translating docs for unreleased features. This raises the entry barrier and makes it more difficult to progress with translation projects.

<p align="center">

<img width="350" src="./docs/release-tracking-example.webp" title="Release Tracking Example" alt="Release Tracking Example">

_Example: Yuki-no tracks release status and updates issue comments accordingly_

</p>

Yuki-no provides `release-tracking` and `release-tracking-labels` options. When enabled, Yuki-no provides release status for commits using Issue Comments and Issue Labels. This allows you to easily identify which parts actually need translation.

### Work Status Tracking

Whether working alone or in a group, translation work needs to clearly track who is handling which parts. Without proper management, problems like duplicate work or incorrect translations can occur.

Ryu-Cho allows work status management based on GitHub Issues. However, it doesn't provide functionality to set Labels for created Issues, which can lead to translation Issues getting mixed with general Issues. This can make it difficult to track work status.

Yuki-no also uses GitHub Issues for work status management. Additionally, Yuki-no provides a `labels` option. This allows you to specify Labels for translation sync Issues and easily filter to view only translation Issues.

### Yuki-no

Yuki-no fulfills the "three essential features for technical docs translation projects" and provides various other features and improvements. These include using GitHub Actions Bot by default, easier and clearer Actions config, `include` and `exclude` options for specifying change tracking targets based on [Glob patterns](https://github.com/micromatch/picomatch?tab=readme-ov-file#advanced-globbing), and a `verbose` option for more detailed logging.

If you're planning to start a translation project or considering implementing Yuki-no in an existing translation project, [check out this guide](https://shj.rip/article/Getting-Started-with-Technical-Documentation-Translation-on-GitHub.html). There's also a [migration guide](./MIGRATION.md) for users of issue-based translation processes like Ryu-Cho. For real-world usage examples, you can refer to the [vite/docs-ko repo](https://github.com/vitejs/docs-ko/blob/main/.github/workflows/sync.yml).

## Other Open-Source Solutions

Most open-source solutions were deemed unsuitable for docs translation projects because they either focus on application localization ([Tolgee](https://github.com/tolgee/tolgee-platform)), are not open-source ([Crowdin](https://crowdin.com/)), or have complexity issues ([GitLocalize](https://gitlocalize.com/)).

### Weblate

[Weblate](https://github.com/WeblateOrg/weblate) is a powerful open-source translation solution that provides various features along with real-time collaboration. It offers integration with Git-based platforms like GitHub and GitLab and is continuously developed with an active community.

However, it requires self-hosting and has complex setup and maintenance requirements. While it provides a web-based translation platform, this unfamiliarity might actually become a barrier to entry. Additionally, with its many features, it might not be suitable for projects seeking a streamlined translation process.

### Docusaurus

[Docusaurus](https://github.com/facebook/docusaurus) is a static website generator developed by Meta (formerly Facebook) with built-in i18n capabilities. From a translation process perspective, it has the following characteristics:

**Advantages:**

- Provides basic structure and tools for translation
- Quick and easy multilingual site setup
- Automatic translation file generation
- Translation progress tracking

**Disadvantages:**

- Manual translation synchronization process
- Difficult to track changes in original documentation
- Lack of release status tracking
- Not optimized for GitHub Issues-based collaboration

While Docusaurus is an excellent tool for building documentation sites, it has limitations in terms of translation process automation. Yuki-no complements these limitations by enabling efficient GitHub-based translation processes.
