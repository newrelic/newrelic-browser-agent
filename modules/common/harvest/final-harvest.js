import { sendFinal } from './harvest'
import { conditionallySet } from '../../../agent/nav-cookie'

export function finalHarvest () {
    sendFinal()
    // write navigation start time cookie if needed
    conditionallySet()
}