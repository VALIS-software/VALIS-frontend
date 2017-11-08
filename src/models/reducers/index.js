import { combineReducers } from 'redux'
import tracks from './tracks'
import regions from './regions'
import selection from './selection'


const browserReducer = combineReducers({
  tracks,
  regions,
  selection
})

export default browserReducer