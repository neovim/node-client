import capitalize from 'lodash.capitalize';
import camelcase from 'lodash.camelcase';
// Parses nvim api info and generates node client API names
export function parseFunctionMetadata({ prefixMap, name }) {
  let typeName;
  let methodName;

  const matchedPrefix = Object.keys(prefixMap).find(
    prefix => name.indexOf(prefix) === 0
  );
  if (matchedPrefix) {
    typeName = prefixMap[matchedPrefix];

    methodName = camelcase(name.replace(matchedPrefix, ''));
  } else {
    // The type name is the word before the first dash capitalized. If the type
    // is Vim, then it a editor-global method which will be attached to the Nvim
    // class.
    const parts = name.split('_');
    typeName = capitalize(parts[0]);
    methodName = camelcase(
      (typeName === 'Ui' ? parts : parts.slice(1)).join('_')
    );
  }

  return {
    typeName,
    methodName,
  };
}
