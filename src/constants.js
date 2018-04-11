const CRLF = '\r\n';
const IS_CACHE_FOLDERS =  /[\\\/](?:cls|inc|web|dfi|int|mac|bas|mvb|mvi)/;
const GLOB_CACHE_FOLDERS = '{cls,inc,mac,dfi,bas,mvb,mvi,web}/**/*'

module.exports = {
  CRLF,
  IS_CACHE_FOLDERS,
  GLOB_CACHE_FOLDERS
};
