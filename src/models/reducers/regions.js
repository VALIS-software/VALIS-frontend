/**
 * @file Reducer for handling region state 
 * @author Salik Syed
 */
 
const regions = (state = [], action) => {
  switch (action.type) {
    case 'ADD_REGION':
      // TODO
      // look up the parent region and ensure that this
      // region fits inside of the parent region or if not, grow the parent region

      // copy the region in and return the new state tree
      return []
    case 'REMOVE_REGION':
      // TODO
      // remove region. lookup parent region and update bounds
      return []
    default:
      return state
  }
}

export default regions