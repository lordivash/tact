/**
 * @import {Root} from 'mdast'
 * @import {VFile} from 'vfile'
 */
import { visit } from 'unist-util-visit';

/**
 * Maximum allowed characters in a Chrome
 * Firefox has more limit but we are using less for compatibility
 */
const maxAllowedCharacters = 32779;

/**
 * Adds links to every code block, allowing to open its contents in the Web IDE
 *
 * @returns Transform.
 */
export default function remarkLinksToWebIDE() {
  /**
   * @param tree {Root}
   * @param file {VFile}
   * @return {undefined}
   */
  return function(tree, file) {
    // Specifying 'code' items guarantees non-inline code blocks
    visit(tree, 'code', function(node, index, parent) {
      // Only allow Tact code blocks
      if (node.lang !== 'tact') { return undefined; }

      // Only allow certain amount of characters
      let src = node.value.trim();
      if (src.length > maxAllowedCharacters) { return undefined; }

      // Disallow single-line code blocks as they pose very little value and they often represent function signatures in the Reference section
      const lines = src.split('\n');
      if (lines.length <= 1) { return undefined; }

      // Only allow pages in the Cookbook plus some cheat sheet pages from the Book
      // NOTE: This limitation can be lifted in the future if there's popular demand
      const notCookbook = file.path.indexOf('docs/cookbook') === -1;
      const notLearnXY = file.path.indexOf('learn-tact-in-y-minutes') === -1;
      if (notCookbook && notLearnXY) {
        return undefined;
      }

      // Skip first code block in "learn Tact in Y minutes", the one with comments
      if (!notLearnXY && lines[0]?.startsWith('// Single-line (//) comments')) {
        return undefined;
      }

      // Detect module-level items
      let hasModuleItems = false;
      for (let i = 0; i < lines.length; i += 1) {
        // Same regex as in scripts/typecheck-examples.js
        const matchRes = lines[i].match(/^\s*(?:import|primitive|const|asm|fun|extends|mutates|virtual|override|inline|abstract|@name|@interface|contract|trait|struct|message)\b/);
        // TODO: Unite the regexes when Tact 2.0 arrives (or if some new module-level item arrives, or via try/catch and reusing compiler's parser)

        if (matchRes !== null) {
          hasModuleItems = true;
          break;
        }
      }

      // Adjust the source code if the module-level items are NOT present
      if (!hasModuleItems) {
        src = [
          'fun fromTactDocs() {',
          lines.map(line => `    ${line}`).join('\n'),
          '}',
        ].join('\n');
      }

      // Obtain a URI-encoded Base64 string from the source code
      const encoded = encodeURIComponent(Buffer.from(src).toString('base64'));

      // Double-check the number of characters in the link
      const link = `https://ide.ton.org/#lang=tact&code=${encoded}`;
      if (link.length > maxAllowedCharacters) { return undefined; }

      /** @type import('mdast').Html */
      const button = {
        type: 'html',
        value: [
          // Constructing opening <a> tag
          [
            // Open the tag
            '<a data-pagefind-ignore="all"',
            // Make links opened in new tab
            'target="_blank"',
            // Set styles
            'class="web-ide-link"',
            // Add hyperref with > to close the tag
            `href="${link}">`,
          ].join(' '),
          // The text to click on
          '<span class="web-ide-link-span">▶️ Open in Web IDE</span>',
          // Closing </a> tag
          '</a>',
        ].join(''),
      };

      // Place the button after the code block
      parent.children.splice(index + 1, 0, button);
    });
  }
}
