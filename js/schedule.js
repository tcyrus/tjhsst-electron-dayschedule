/* global $ */
$(document).ready(() => {
	setToHappen = (fn, d) => {
		let t = d.getTime() - new Date().getTime();
		return setTimeout(fn, t);
	}

	scheduleBind = () => {
		$(".schedule-outer .schedule-left").click(event => {
			event.preventDefault();
			scheduleView(-1);
		});

		$(".schedule-outer .schedule-right").click(event => {
			event.preventDefault();
			scheduleView(1);
		});
	};

	genOrigSearch = part_exclude => {
		let qs = location.search.substring(1);
		const searchparts = qs.split("&");
		var osearch = "";

		for (var el of searchparts) {
			// console.debug(el);
			if (el.length > 0 && el.substring(0, part_exclude.length+1) !== `${part_exclude}=`)
				osearch += `${el}&`;
		}
		return osearch;
	};

	window.osearch = genOrigSearch("date");
	//console.info("osearch:", window.osearch);

	scheduleView = reldate => {
		$sch = $(".schedule");

		const endpoint = $sch.attr("data-endpoint");
		const prev = $sch.attr("data-prev-date");
		const next = $sch.attr("data-next-date");

		if (reldate === 1) date = next;
		else if (reldate === -1) date = prev;
		else date = reldate;

		if (history.pushState) {
			let nosearch = genOrigSearch("date");

			if (nosearch !== window.osearch)
				window.osearch = nosearch;

			let url = `?${window.osearch}date=${date}`;
			console.debug(url);
			history.pushState(null, null, url);
		}

		$.get(endpoint, {"date": date, "no_outer": true}, d => {
			$(".schedule-outer").html(d);
			scheduleBind();
			displayPeriod();
		});
	};

	formatDate = date => {
		//console.log("date:", date);
		let [y, m, d] = date.split("-");
		return new Date(y, m-1, d);
	}

	formatTime = (time, date) => {
		let d = new Date(date);

		let [hr, mn] = time.split(":");
		hr = parseInt(hr);
		mn = parseInt(mn);

		d.setHours(hr < 7 ? hr+12 : hr);
		d.setMinutes(mn);
		return d;
	}


	getPeriods = () => {
		$sch = $(".schedule");
		const blocks = $(".schedule-block[data-block-order]", $sch);
		const curDate = formatDate($sch.attr("data-date"));

		return blocks.map(function() {
			let start = $(this).attr("data-block-start");
			let startDate = formatTime(start, curDate);

			let end = $(this).attr("data-block-end");
			let endDate = formatTime(end, curDate);

			return {
				"name": $(this).attr("data-block-name"),
				"start": {
					"str": start,
					"date": startDate
				},
				"end": {
					"str": end,
					"date": endDate
				},
				"order": $(this).attr("data-block-order")
			};
		}).get();
	}

	getPeriodElem = period => $(`.schedule-block[data-block-order='${period.order}']`)

	withinPeriod = (period, now) => {
		let st = period["start"].date;
		let en = period["end"].date;
		return now >= st && now < en;
	}

	betweenPeriod = (period1, period2, now) => {
		let en = period1["end"].date;
		let st = period2["start"].date;
		return now >= en && now < st;
	}

	getCurrentPeriod = now => {
		$sch = $(".schedule");
		let schDate = $sch.attr("data-date");
		if (!schDate) return;
		let curDate = formatDate(schDate);
		if (!now) now = new Date();
		const periods = getPeriods();

		for (var i = 0; i < periods.length; i++) {
			const period = periods[i];
			if (withinPeriod(period, now)) {
				return {
					"status": "in",
					"period": period
				};
			}
			if (i+1 < periods.length && betweenPeriod(period, periods[i+1], now)) {
				return {
					"status": "between",
					"prev": period,
					"next": periods[i+1]
				};
			}
		}

		return false;
	}

	window.prevPeriod = null;

	displayPeriod = now => {
		$sch = $(".schedule");
		if (!now) now = new Date();
		const current = getCurrentPeriod(now);
		// if (current != window.prevPeriod) console.debug(`${now.getHours()}:${now.getMinutes()}`, "current:", current);
		window.prevPeriod = current;
		$(".schedule-block").removeClass("current");
		$(".schedule-block-between").remove();

		var timeout, times = "";

		if (!!current) {
			if (current.status === "in") {
				let p = getPeriodElem(current.period);
				p.addClass('current');
				times = `${current.period.start.str} - ${current.period.end.str}`;
				timeout = current.period.end.date;
			} else if (current.status === "between") {
				let prev = getPeriodElem(current.prev);
				//var next = getPeriodElem(current.next);
				times = `${current.prev.end.str} - ${current.next.start.str}`;
				prev.after(`<tr class='schedule-block schedule-block-between current'><th>Passing:</th><td>${times}</td></tr>`);
				timeout = current.next.start.date;
			}
		} else {
			const periods = getPeriods();
			if ((periods.length > 0) && (now < periods[0].start.date)) {
				timeout = periods[0].start.date;
			} else {
				timeout = new Date()
				timeout.setHours(24, 0, 0, 0)
			}
		}

		$(document).trigger('displayPeriod', times);
		setToHappen(displayPeriod, timeout);
	}
});
