"use strict";

angular.module("DocApp").controller("AllDocsCtrl",
function(
  $scope,
  NavServices,
  DocFactory, TeamFactory, UserFactory
) {

  $scope.usersDocs = [];
  $scope.teamDocs = [];
  const loggedInUid = firebase.auth().currentUser.uid;
  const thisTeamsID = NavServices.go.getTeamsID();
  let docs;

  // Attaches display name for the doc owner. all-docs.html prints display
  // name for docs not owned by user.
  const getDisplayNameForEachDoc = () => {
    let keys = Object.keys(docs);
    let promises = [];
    keys.forEach(key => promises.push(
      UserFactory.getUser(docs[key].uid)
      .then(userData => docs[key].displayName = userData.displayName)
    ));
    return Promise.all(promises);
  };

  const getReviewerNameForEachCompleted = () => {
    let keys = Object.keys(docs);
    let promises = [];
    keys.forEach(key => {
      if (docs[key].reviewer)
        promises.push(
          UserFactory.getUser(docs[key].reviewer)
          .then(userData => docs[key].reviewerName = userData.displayName)
          .catch(err => console.log(err))
        );
    });
    return Promise.all(promises);
  };

  // Sorts docs into either user's or teams. all-docs.html sorts into
  // pending & completed based on "completed" prop in each doc obj.
  // TODO: Refactor for DRY-er code.
  const sortDocs = () => {
    for (let key in docs) {
      if (docs[key].uid === loggedInUid) {
        UserFactory.getUser(loggedInUid)
        .then(userData => {
          docs[key].displayName = userData.displayName;
          $scope.usersDocs.push(docs[key]);
        })
        .catch(err => console.log(err));
      } else {
        UserFactory.getUser(docs[key].uid)
        .then(userData => {
          docs[key].displayName = userData.displayName;
          $scope.teamDocs.push(docs[key]);
        })
        .catch(err => console.log(err));
      }
    }
  };

  const getDataForPage = data => {
    $scope.team = data;
    DocFactory.getDocs($scope.team.firebaseID)
    .then(docData => {
      docs = docData;
      return getDisplayNameForEachDoc();
    })
    .then(() => {
      getReviewerNameForEachCompleted();
    })
    .then(() => sortDocs())
    .catch(err => console.log(err));
  };

  $scope.toNewDoc = () => NavServices.go.toNewDoc($scope.team.firebaseID);
  $scope.toTeamsLogin = () => NavServices.go.toTeamsLogin();
  $scope.toDocCompleted =
    doc_id => NavServices.go.toDocCompleted(thisTeamsID, doc_id);
  $scope.toDocPending =
    doc_id => NavServices.go.toDocPending(thisTeamsID, doc_id);

  //Verifies user has access to team, redirects to team-login otherwise
  TeamFactory.verifyUserAccess(thisTeamsID, loggedInUid)
  .then(team => getDataForPage(team)) // Kicks off getting data for page
  .catch(() => NavServices.go.toTeamsLogin());
});
