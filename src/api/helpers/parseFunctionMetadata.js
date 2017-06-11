const _ = require("lodash");

// Parses nvim api info and generates node client API names
function parseFunctionMetadata({ prefixMap, name }) {
  let typeName;
  let methodName;

  const matchedPrefix = Object.keys(prefixMap).find(
    prefix => name.indexOf(prefix) === 0
  );
  if (matchedPrefix) {
    typeName = prefixMap[matchedPrefix];
    methodName = _.camelCase(name.replace(matchedPrefix, ""));
  } else {
    // The type name is the word before the first dash capitalized. If the type
    // is Vim, then it a editor-global method which will be attached to the Nvim
    // class.
    const parts = name.split("_");
    typeName = _.capitalize(parts[0]);
    methodName = _.camelCase(
      (typeName === "Ui" ? parts : parts.slice(1)).join("_")
    );
  }

  return {
    typeName,
    methodName
  };
}

module.exports = parseFunctionMetadata;
module.exports.default = module.exports;
