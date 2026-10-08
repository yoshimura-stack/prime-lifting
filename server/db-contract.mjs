// Existing database definitions were NOT included in the supplied ZIP.
// Do not enable until sql/inspect-existing.sql has been reviewed and the
// mapping, server-side PIN hashing, grants, atomic best update and run
// deduplication have been implemented and tested against that actual schema.
export default {
 verified:false,
 operations:{
  register:null,
  login:null,
  me:null,
  submit:null,
  leaderboard:null
 }
};
