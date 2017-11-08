/**
 * @file Reducer for handling selection state
 * @author Salik Syed
 */
const selection = (state = [], action) => {
  switch (action.type) {
    case 'ADD_REGION_TRACK':
      // TODO
      // takes in the (region_id, track_id) and adds it to the selection
      // will add children as well
      return []
    case 'REMOVE_REGION_TRACK':
      // TODO:
      // takes in the (region_id, track_id) and removes it from the selection
      // will remove children as well
      return []
    default:
      return state
  }
}

export default selection