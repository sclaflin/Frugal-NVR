import Iterable from './Iterable';
import Event from './Event';

export default class Events extends Iterable {
	add(...items) {
		if(items.filter(item => !(item instanceof Event)) > 0)
			throw new TypeError('all arguments must be an Event object.');
			
		super.add(...items);
	}
}