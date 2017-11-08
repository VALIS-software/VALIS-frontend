/**
 * @file Reducer for handling track state
 * @author Salik Syed
 */

const tracks = (state = [], action) => {
  switch (action.type) {
    case 'ADD_TRACK':
      // TODO
      // copy the region in and return the new state tree
      return []
    case 'REMOVE_TRACK':
      // TODO:
      // Remove this track and all it's children from the state tree

      // copy the region in and return the new state tree
      return []

    case 'SET_POSITION':
      // TODO: set the order of the track within the tree
      return []
    case 'UPDATE':
      // TODO:
      // this is called as a handler for
      // the async call the action 
      return
    default:
      return state
  }
}

export default tracks