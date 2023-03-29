import Iterable from '../../lib/Iterable';
import DialogView from './DialogView';

export default class Dialogs extends Iterable {
	add(...items) {
		if (items.filter(item => !(item instanceof DialogView)) > 0)
			throw new TypeError('all arguments must be a DialogView object.');

		super.add(...items);
	}
}
